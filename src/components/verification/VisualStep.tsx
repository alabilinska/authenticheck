import { defaultKnowledge } from "@/lib/services/tag-validation/evaluate";
import type { RuleDef } from "@/lib/services/tag-validation/schema";
import type { TagObservation } from "@/types";
import type { StepProps } from "./draft";
import { ChoiceGroup, ReferencePhoto, StepHeading, type Option } from "./fields";

type VisualRule = Extract<RuleDef, { kind: "visualTrait" | "zipperEra" }>;

// Questions, hints and photos are data (rules §7 → knowledge file), in rule-ID order.
const visualRules = defaultKnowledge.rules.filter(
  (rule): rule is VisualRule => rule.kind === "visualTrait" || rule.kind === "zipperEra",
);

const yesNoOptions: Option<TagObservation["thread"]>[] = [
  { value: "yes", label: "Tak" },
  { value: "no", label: "Nie" },
  { value: "unknown", label: "Nie widać" },
];

const zipperOptions: Option<TagObservation["zipper"]>[] = [
  { value: "lampo", label: "Lampo", hint: "Napis kursywą, litera L podkreśla resztę słowa." },
  { value: "b", label: "Litera B", hint: "Wykończenie matowe lub satynowe." },
  { value: "unknown", label: "Nie widać" },
];

export function VisualStep({ draft, errors, update }: StepProps) {
  return (
    <>
      <StepHeading title="Cechy wizualne">
        Trzy szczegóły ze zdjęć w ogłoszeniu. Porównaj je ze zdjęciem poglądowym.
      </StepHeading>
      {visualRules.map((rule) => (
        <div key={rule.id} className="space-y-3">
          <ReferencePhoto src={rule.reference.src} alt={rule.reference.alt} />
          {rule.kind === "zipperEra" ? (
            <ChoiceGroup
              name="zipper"
              legend={rule.question}
              hint={rule.hint}
              options={zipperOptions}
              value={draft.zipper}
              onChange={(v) => {
                update("zipper", v);
              }}
              error={errors.zipper}
            />
          ) : (
            <ChoiceGroup
              name={rule.field}
              legend={rule.question}
              hint={rule.hint}
              options={yesNoOptions}
              value={draft[rule.field]}
              onChange={(v) => {
                update(rule.field, v);
              }}
              error={errors[rule.field]}
            />
          )}
        </div>
      ))}
    </>
  );
}
