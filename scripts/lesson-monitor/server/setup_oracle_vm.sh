#!/usr/bin/env bash
# The lesson monitor on an Oracle Cloud Always Free ARM VM (Ubuntu 24.04, aarch64). Run as root on the VM:
#
#   sudo bash setup_oracle_vm.sh install        # packages, the job's user and folders, tmpfs audio, venv, service
#   sudo bash setup_oracle_vm.sh seal-key       # the key that seals the sign-in and the voiceprints (once)
#   sudo bash setup_oracle_vm.sh set-groq       # paste the Groq API key (hidden)
#   sudo bash setup_oracle_vm.sh set-cloudflare # paste the Cloudflare account id and Workers AI token (hidden)
#   sudo bash setup_oracle_vm.sh signin         # the job account's email + password, ONCE (hidden; only a sealed token is kept)
#   sudo bash setup_oracle_vm.sh selftest       # the job's offline tests, on this machine
#   sudo bash setup_oracle_vm.sh enable         # start now and at every boot
#   sudo bash setup_oracle_vm.sh status | logs | stop | start
#   sudo bash setup_oracle_vm.sh kill-switch on|off   # the STOP file: nothing downloads, a running job stops and deletes
#   sudo bash setup_oracle_vm.sh delete-everything    # the service, the user, every file, every secret (asks first)
#
# `install` expects what push_to_vm.ps1 copied to /opt/hec-monitor/incoming: code.tar (scripts/lesson-monitor and
# scripts/lesson-eval/common.py from the repo), models/ (faster-whisper large-v3-turbo and the six voice models),
# step0.json (step 0's numbers) and env (the two PUBLIC Supabase values). See README.md next to this file.
set -euo pipefail

BASE=/opt/hec-monitor
DATA=/var/lib/hec-monitor
PILOT=$DATA/pilot
ETC=/etc/hec-monitor
CRED=/etc/credstore.encrypted
UNIT=/etc/systemd/system/hec-lesson-monitor.service
USR=hecmon
PY=$BASE/venv/bin/python
AUDIO_TMPFS_SIZE=${AUDIO_TMPFS_SIZE:-3G}

need_root() { [ "$(id -u)" = 0 ] || { echo "run with sudo"; exit 1; }; }
say() { printf '\n== %s\n' "$*"; }

as_job() {  # run a command as the job's user with the service's settings and the seal key
  systemd-run --quiet --wait --collect --pipe --uid=$USR --gid=$USR \
    -p WorkingDirectory=$BASE/code -p EnvironmentFile=$ETC/env \
    -p "LoadCredentialEncrypted=seal-key:$CRED/seal-key" \
    -E HEC_EVAL_ROOT=$DATA -E HEC_PILOT_ROOT=$PILOT -E HEC_SESSION_FILE=$DATA/session.bin \
    -E HF_HOME=$DATA/models/hf -E HF_HUB_OFFLINE=1 "$@"
}

seal() {  # seal stdin as credential $1
  install -d -m 0700 $CRED
  systemd-creds encrypt --name="$1" - "$CRED/$1"
  chmod 0600 "$CRED/$1"
}

cmd_install() {
  need_root
  local arch; arch=$(uname -m)
  [ "$arch" = aarch64 ] || [ "$arch" = x86_64 ] || { echo "unsupported machine $arch"; exit 1; }
  [ -f $BASE/incoming/code.tar ] || { echo "no $BASE/incoming/code.tar: run push_to_vm.ps1 on the PC first"; exit 1; }
  systemd-creds --help >/dev/null 2>&1 || { echo "systemd-creds is missing (needs systemd 250+; Ubuntu 24.04 has it)"; exit 1; }

  say "packages"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 python3-venv python3-dev build-essential libsndfile1 >/dev/null

  say "the job's user and folders"
  id $USR >/dev/null 2>&1 || useradd --system --home-dir $DATA --shell /usr/sbin/nologin $USR
  install -d -m 0755 $BASE
  install -d -m 0700 -o $USR -g $USR $DATA $PILOT $PILOT/audio $PILOT/step0 $PILOT/state $DATA/models
  install -d -m 0755 $ETC
  # Audio lives in memory only: a tmpfs over the audio folder, owned by the job, readable by nobody else.
  if ! grep -q " $PILOT/audio " /etc/fstab; then
    echo "tmpfs $PILOT/audio tmpfs size=$AUDIO_TMPFS_SIZE,mode=0700,uid=$(id -u $USR),gid=$(id -g $USR),noexec,nosuid,nodev 0 0" >> /etc/fstab
  fi
  mountpoint -q $PILOT/audio || mount $PILOT/audio

  say "code"
  rm -rf $BASE/code.new && install -d $BASE/code.new
  tar -xf $BASE/incoming/code.tar -C $BASE/code.new
  # A code.tar made before .gitattributes (27 Nov 2026) on a Windows checkout carries CRLF: bash and systemd refuse it.
  find $BASE/code.new -type f \( -name '*.sh' -o -name '*.service' \) -exec sed -i 's/\r$//' {} +
  rm -rf $BASE/code && mv $BASE/code.new $BASE/code
  chown -R root:root $BASE/code && chmod -R go-w $BASE/code

  say "models (faster-whisper large-v3-turbo, ECAPA, TitaNet, WeSpeaker x2, 3D-Speaker x2)"
  if [ -d $BASE/incoming/models ]; then
    if [ -f $BASE/incoming/models.sha256 ]; then  # push_to_vm.ps1's list of the PC's hashes
      (cd $BASE/incoming/models && tr -d '\r' < ../models.sha256 | sha256sum -c --quiet -) \
        || { echo "a model differs from the PC's copy: run push_to_vm.ps1 again"; exit 1; }
    fi
    cp -a $BASE/incoming/models/. $DATA/models/
    chown -R $USR:$USR $DATA/models
  fi
  for f in faster-whisper speechbrain/spkrec-ecapa-voxceleb sherpa/nemo_en_titanet_large.onnx \
           sherpa/wespeaker_en_voxceleb_resnet34_LM.onnx "sherpa/wespeaker_en_voxceleb_CAM++.onnx" \
           sherpa/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx sherpa/3dspeaker_speech_eres2netv2_sv_zh-cn_16k-common.onnx; do
    [ -e "$DATA/models/$f" ] || echo "WARNING: model missing: $f (that voice model is skipped)"
  done

  say "step 0 and settings"
  [ -f $BASE/incoming/step0.json ] && install -m 0600 -o $USR -g $USR $BASE/incoming/step0.json $PILOT/step0/result.json
  [ -f $BASE/incoming/env ] && install -m 0644 $BASE/incoming/env $ETC/env
  [ -f $ETC/env ] || { echo "no $ETC/env (HEC_SUPABASE_URL and HEC_SUPABASE_PUBLISHABLE_KEY)"; exit 1; }

  say "Python and the packages (ARM wheels: ctranslate2, onnxruntime, sherpa-onnx, torch CPU)"
  [ -x $PY ] || python3 -m venv $BASE/venv
  $PY -m pip install -q --upgrade pip
  $PY -m pip install -q "faster-whisper==1.2.1" soundfile scipy numpy cryptography onnxruntime sherpa-onnx pytest
  $PY -m pip install -q --index-url https://download.pytorch.org/whl/cpu --extra-index-url https://pypi.org/simple torch torchaudio
  $PY -m pip install -q speechbrain
  $PY -c "import ctranslate2, onnxruntime, sherpa_onnx, speechbrain, torch, cryptography, soundfile; print('packages ok')"

  say "service"
  install -m 0644 $BASE/code/scripts/lesson-monitor/server/hec-lesson-monitor.service $UNIT
  systemctl daemon-reload

  say "SSH and firewall"
  if sshd -T 2>/dev/null | grep -qi '^passwordauthentication yes'; then
    # sshd takes the FIRST value it reads, so the name must sort before 50-cloud-init.conf.
    rm -f /etc/ssh/sshd_config.d/90-hec.conf
    printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/01-hec.conf
    systemctl reload ssh || systemctl reload sshd || true
  fi
  if sshd -T 2>/dev/null | grep -qi '^passwordauthentication yes'; then
    echo "ERROR: sshd still allows password login after the change; fix /etc/ssh/sshd_config.d before going on."
    exit 1
  fi
  echo "ssh: $(sshd -T 2>/dev/null | grep -i '^passwordauthentication')"
  echo "listening (should be only ssh on 22):"; ss -ltnp | awk 'NR>1{print "  "$4}'
  rm -rf $BASE/incoming
  echo
  echo "Installed. Next: seal-key, set-groq, set-cloudflare, signin, selftest, enable."
}

cmd_seal_key() { need_root; [ -f $CRED/seal-key ] && { echo "a seal key exists already (a new one would make the sign-in and voiceprints unreadable)"; exit 1; }
  head -c 32 /dev/urandom | seal seal-key; echo "seal key made and sealed with this machine's key"; }
cmd_set_groq() { need_root; read -r -s -p "Groq API key (hidden): " k; echo; [ -n "$k" ] || exit 1
  printf '%s' "$k" | seal groq-key; unset k; echo "Groq key sealed"; }
cmd_set_cloudflare() { need_root; read -r -p "Cloudflare account id: " a; read -r -s -p "Workers AI API token (hidden): " t; echo
  [ -n "$a" ] && [ -n "$t" ] || exit 1; printf '%s\n%s\n' "$a" "$t" | seal cloudflare-ai; unset t; echo "Cloudflare credentials sealed"; }

cmd_signin() {
  need_root
  [ -f $CRED/seal-key ] || { echo "run seal-key first"; exit 1; }
  systemd-run --quiet --wait --collect --pty --uid=$USR --gid=$USR \
    -p WorkingDirectory=$BASE/code -p EnvironmentFile=$ETC/env \
    -p "LoadCredentialEncrypted=seal-key:$CRED/seal-key" \
    -E HEC_SESSION_FILE=$DATA/session.bin \
    $PY scripts/lesson-monitor/supa.py signin
}

cmd_selftest() {
  need_root
  as_job $PY -m pytest -q -p no:cacheprovider --basetemp=$PILOT/state/pytest scripts/lesson-monitor/tests \
    -k "not real_dpapi and not dpapi_round_trip"
  rm -rf $PILOT/state/pytest
}

cmd_enable() { need_root; for c in seal-key groq-key cloudflare-ai; do [ -f $CRED/$c ] || { echo "missing credential $c"; exit 1; }; done
  [ -f $DATA/session.bin ] || { echo "not signed in: run signin"; exit 1; }
  systemctl enable --now hec-lesson-monitor; systemctl --no-pager status hec-lesson-monitor | head -5; }

cmd_kill_switch() {
  need_root
  case "${1:-}" in
    on) install -m 0600 -o $USR -g $USR /dev/null $PILOT/STOP; systemctl kill -s SIGTERM hec-lesson-monitor 2>/dev/null || true
        find $PILOT/audio -mindepth 1 -delete; echo "STOP is on; audio left: $(find $PILOT/audio -type f | wc -l) files" ;;
    off) rm -f $PILOT/STOP; echo "STOP is off" ;;
    *) echo "kill-switch on|off"; exit 1 ;;
  esac
}

cmd_delete_everything() {
  need_root
  read -r -p "Type DELETE to remove the lesson monitor, its sign-in, voiceprints, secrets and files from this VM: " ok
  [ "$ok" = DELETE ] || { echo "nothing deleted"; exit 1; }
  systemctl disable --now hec-lesson-monitor 2>/dev/null || true
  rm -f $UNIT; systemctl daemon-reload
  if mountpoint -q $PILOT/audio && ! umount $PILOT/audio; then
    echo "Could not unmount $PILOT/audio (something still uses it). Nothing was removed; stop what uses it and run again."
    exit 1
  fi
  sed -i "\# $PILOT/audio #d" /etc/fstab
  rm -rf $DATA $BASE $ETC
  rm -f $CRED/seal-key $CRED/groq-key $CRED/cloudflare-ai
  rmdir $CRED 2>/dev/null || true   # only if empty; the SSH hardening (01-hec.conf) is deliberately kept
  id $USR >/dev/null 2>&1 && userdel $USR
  echo "left: $(ls -d $DATA $BASE $ETC $CRED/seal-key $CRED/groq-key $CRED/cloudflare-ai 2>/dev/null | wc -l) of the job's paths"
  echo "Also: sign the job account out everywhere in the app, revoke the Groq key and the Cloudflare token, then terminate the VM in the Oracle console."
}

case "${1:-}" in
  install) cmd_install ;;
  seal-key) cmd_seal_key ;;
  set-groq) cmd_set_groq ;;
  set-cloudflare) cmd_set_cloudflare ;;
  signin) cmd_signin ;;
  selftest) cmd_selftest ;;
  enable) cmd_enable ;;
  start) need_root; systemctl start hec-lesson-monitor ;;
  stop) need_root; systemctl stop hec-lesson-monitor; echo "stopped; audio left: $(find $PILOT/audio -type f | wc -l) files" ;;
  status) systemctl --no-pager status hec-lesson-monitor | head -15; echo "audio files now: $(find $PILOT/audio -type f 2>/dev/null | wc -l)" ;;
  logs) journalctl -u hec-lesson-monitor --no-pager -n "${2:-80}" ;;
  kill-switch) cmd_kill_switch "${2:-}" ;;
  delete-everything) cmd_delete_everything ;;
  *) sed -n '2,15p' "$0"; exit 1 ;;
esac
