import type { Metadata } from "next";
import { Classifier } from "@/components/Classifier";

export const metadata: Metadata = {
  title: "Class my car",
  description:
    "Pick your car and mods, see your SCCA Solo class — with every modification's legality flagged and cited.",
};

export default function ClassifyPage() {
  return <Classifier />;
}
