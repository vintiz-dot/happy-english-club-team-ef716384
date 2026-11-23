import { useEffect, useState } from "react";
import { Status } from "./pieces";
import { phoneView, subscribePhoneView } from "./phoneLinkLaptop";
import type { LaptopPhoneView } from "@/lib/recorder/deviceLink";

/**
 * The phone, as the laptop sees it over the phone link (23 Nov 2026): whether
 * it is connected and recording. Shown by the recorder screen in "My
 * microphone is my phone" mode.
 */
export function PhoneLinkStatus() {
  const [v, setV] = useState<LaptopPhoneView | null>(() => phoneView());
  useEffect(() => subscribePhoneView(setV), []);
  if (!v) {
    return <Status line={{ tone: "info", text: "Your microphone is your phone: on the phone open /teacher/recorder/phone and press Record. Record or Stop on either device does both." }} />;
  }
  return (
    <div role={v.alert ? "alert" : "status"} data-phone-link-status="">
      <Status line={{ tone: v.alert ? "error" : v.connected ? "ok" : "info", text: v.line }} live />
    </div>
  );
}
