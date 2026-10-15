"use client";
import { useActionState } from "react";
import { saveFood } from "@/app/actions/nutrition";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";
import type { Food } from "@/lib/types";

export function FoodLibraryForm({ food }: { food?: Food }) {
  const [state, action] = useActionState(saveFood, {});
  return (
    <form action={action} className="space-y-4">
      {food && <input type="hidden" name="id" value={food.id} />}
      <Field label="Food name"><Input name="name" defaultValue={food?.name} maxLength={100} required /></Field>
      <Field label="Serving size" hint="Optional, e.g. 1 slice or 250 ml"><Input name="serving_description" defaultValue={food?.serving_description ?? ""} maxLength={100} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories per serving"><Input name="calories_per_serving" type="number" inputMode="decimal" step="any" min="0" defaultValue={food?.calories_per_serving} placeholder="kcal" required /></Field>
        <Field label="Protein per serving"><Input name="protein_per_serving" type="number" inputMode="decimal" step="any" min="0" defaultValue={food?.protein_per_serving} placeholder="g" /></Field>
      </div>
      <p className="text-sm text-muted">Changing a saved food won't change entries you've already logged.</p>
      <FormMessage state={state} />
      <SubmitButton className="w-full">{food ? "Save changes" : "Save food"}</SubmitButton>
    </form>
  );
}
