/**
 * Plain-language help for the one-time setup, as numbered steps a teacher can
 * follow with the laptop in front of them.
 */
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const Steps = ({ items }: { items: string[] }) => (
  <ol className="list-decimal pl-6 space-y-2 text-base leading-relaxed">
    {items.map((s, i) => <li key={i} className="break-words">{s}</li>)}
  </ol>
);

export const HELP = {
  s500: {
    title: "Plug in the room microphone (Anker S500) by USB",
    steps: [
      "Put the round Anker S500 in the middle of the table, where the children sit.",
      "Plug its USB cable into the laptop. Use the cable, not Bluetooth.",
      "If the laptop has paired with the S500 by Bluetooth before, turn Bluetooth off on the laptop (Settings, Bluetooth & devices, Bluetooth: Off), or press the S500's Bluetooth button until its blue light goes out.",
      "Wait five seconds. The S500's light shows it is on.",
      "In the list on this page it is called something like \"Echo Cancelling Speakerphone (Anker PowerConf S500)\". If you see \"Hands-Free\" in the name, it is still on Bluetooth: go back to step 3.",
    ],
  },
  ankerApp: {
    title: "Turn off the S500's own sound cleaning (if its app allows)",
    steps: [
      "On the laptop, open the AnkerWork app. If it is not installed, skip this part: the recorder still works.",
      "Choose the PowerConf S500.",
      "If you see switches called Noise Reduction, Voice Enhancement or Auto Gain, turn them off.",
      "Close the app. The S500 remembers the setting.",
      "Some cleaning is built into the S500 and cannot be turned off. That is fine; the recorder notes it.",
    ],
  },
  windows: {
    title: "Check the Windows sound settings",
    steps: [
      "Click the Start button and open Settings.",
      "Go to System, then Sound.",
      "Under Input, click the S500 (\"Echo Cancelling Speakerphone\").",
      "Find Audio enhancements and set it to Off. If you see Voice clarity or Effects, turn those off too.",
      "Set the Input volume to 100.",
      "Go back and do the same for your lapel receiver (often called \"USB Audio Device\").",
      "Scroll down and click More sound settings. On the Recording tab, the recorder does NOT need either microphone to be the \"Default Communication Device\" - leave that as it is. The recorder picks each microphone by name.",
      "Click OK. You only do this once on this laptop.",
    ],
  },
  lapel: {
    title: "Plug in your lapel microphone",
    steps: [
      "Plug the small receiver into a USB port on the laptop.",
      "Switch the clip-on transmitter on and clip it to your collar, about a hand's width below your chin.",
      "Check its light shows it is connected to the receiver.",
    ],
  },
};

export function HelpPanels({ only }: { only?: (keyof typeof HELP)[] }) {
  const keys = only ?? (Object.keys(HELP) as (keyof typeof HELP)[]);
  return (
    <Accordion type="multiple" className="w-full">
      {keys.map((k) => (
        <AccordionItem key={k} value={k}>
          <AccordionTrigger className="text-left text-base min-h-11">{HELP[k].title}</AccordionTrigger>
          <AccordionContent><Steps items={HELP[k].steps} /></AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
