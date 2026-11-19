"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart, X } from "lucide-react";
import { CatalogPicker } from "@/components/catalog-picker";
import { IngredientSheet } from "@/components/ingredient-sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useSaveRecipe } from "@/lib/client/mutations";
import { FormError, parseText } from "@/lib/client/validate";
import { parseDecimal } from "@/lib/number";
import { readNutrients, sumItems } from "@/lib/nutrition";
import type { PickedFood } from "@/lib/catalog";
import { baseAmount, formatAmount, itemFromPicked, itemsFromMeal, servingUnit, type RecipeItem } from "@/lib/recipe";
import type { Food, Meal } from "@/lib/types";
import { fmt } from "@/lib/utils";

type Row = { key: string; item: RecipeItem; amount: string };

let counter = 0;
const newKey = () => `r${++counter}`;

/** Create or edit a recipe: a name and ingredients, each with the amount the recipe uses. */
export function RecipeForm({ recipe }: { recipe?: Meal }) {
  const router = useRouter();
  const save = useSaveRecipe();
  const [name, setName] = useState(recipe?.name ?? "");
  const [rows, setRows] = useState<Row[]>(() => (recipe ? itemsFromMeal(recipe).map((item) => ({ key: newKey(), item, amount: formatAmount(baseAmount(item)) })) : []));
  const [picking, setPicking] = useState(false);
  const [pickingCatalog, setPickingCatalog] = useState(false);
  const [error, setError] = useState("");

  const add = (f: Food) => {
    const item: RecipeItem = {
      food_id: f.id, name: f.name, serving: f.serving_description, qty: 1, calories: Number(f.calories_per_serving), protein: Number(f.protein_per_serving),
      nutrients: readNutrients(f as unknown as Record<string, unknown>),
    };
    setRows((l) => [...l, { key: newKey(), item, amount: formatAmount(servingUnit(f.serving_description).per) }]);
    setPicking(false);
  };

  /** A supermarket product from the catalog (search or barcode) joins the recipe with the amount picked. */
  const addCatalog = (p: PickedFood) => {
    const { item, amount } = itemFromPicked(p);
    setRows((l) => [...l, { key: newKey(), item, amount: formatAmount(amount) }]);
    setPickingCatalog(false);
  };

  /** One serving of the ingredient times how many servings the typed amount is. */
  const qtyOf = (r: Row) => {
    const a = parseDecimal(r.amount);
    return r.amount.trim() !== "" && Number.isFinite(a) && a > 0 ? a / servingUnit(r.item.serving).per : 0;
  };
  const totals = sumItems(rows.map((r) => ({ ...r.item, qty: qtyOf(r) })));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (save.isPending) return;
    setError("");
    try {
      const title = parseText(name, "recipe name", 100, true);
      if (rows.length === 0) throw new FormError("Add at least one ingredient.");
      const items = rows.map((r) => {
        const { per, unit } = servingUnit(r.item.serving);
        const qty = Math.round(qtyOf(r) * 100) / 100;
        if (qty < 0.01 || qty > 100) throw new FormError(`Amount for ${r.item.name} must be between ${fmt(0.01 * per, 2)} and ${fmt(100 * per)} ${unit}.`);
        return { ...r.item, qty };
      });
      await save.mutateAsync({ id: recipe?.id, name: title, items });
      router.push("/add/recipes");
    } catch (err) {
      setError(err instanceof FormError ? err.message : "Couldn't save the recipe. Check your connection and try again.");
    }
  }
