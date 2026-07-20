import Decimal from "decimal.js";

export type Unit =
  | "EACH"
  | "PACK"
  | "TIN"
  | "JAR"
  | "LOAF"
  | "GRAM"
  | "KILOGRAM"
  | "MILLILITRE"
  | "LITRE";

const labels: Record<Unit, string> = {
  EACH: "each",
  PACK: "pack",
  TIN: "tin",
  JAR: "jar",
  LOAF: "loaf",
  GRAM: "g",
  KILOGRAM: "kg",
  MILLILITRE: "ml",
  LITRE: "l"
};

export function unitLabel(unit: Unit): string {
  return labels[unit];
}

export function normaliseUnit(input: string): Unit | null {
  const value = input.trim().toLowerCase();
  const map: Record<string, Unit> = {
    each: "EACH",
    ea: "EACH",
    pack: "PACK",
    packs: "PACK",
    tin: "TIN",
    tins: "TIN",
    can: "TIN",
    cans: "TIN",
    jar: "JAR",
    jars: "JAR",
    loaf: "LOAF",
    loaves: "LOAF",
    gram: "GRAM",
    grams: "GRAM",
    g: "GRAM",
    kilogram: "KILOGRAM",
    kilograms: "KILOGRAM",
    kg: "KILOGRAM",
    millilitre: "MILLILITRE",
    millilitres: "MILLILITRE",
    ml: "MILLILITRE",
    litre: "LITRE",
    litres: "LITRE",
    l: "LITRE"
  };
  return map[value] ?? null;
}

export function convertQuantity(quantity: Decimal.Value, from: Unit, to: Unit): Decimal {
  const amount = new Decimal(quantity);
  if (amount.lt(0)) throw new Error("Quantity cannot be negative");
  if (from === to) return amount;
  if (from === "GRAM" && to === "KILOGRAM") return amount.div(1000);
  if (from === "KILOGRAM" && to === "GRAM") return amount.mul(1000);
  if (from === "MILLILITRE" && to === "LITRE") return amount.div(1000);
  if (from === "LITRE" && to === "MILLILITRE") return amount.mul(1000);
  throw new Error(`Cannot convert ${from} to ${to}`);
}

export function canConvert(from: Unit, to: Unit): boolean {
  try {
    convertQuantity(1, from, to);
    return true;
  } catch {
    return false;
  }
}

export function packsNeeded(requiredQuantity: Decimal.Value, requiredUnit: Unit, packageQuantity: Decimal.Value, packageUnit: Unit) {
  const required = convertQuantity(requiredQuantity, requiredUnit, packageUnit);
  const packSize = new Decimal(packageQuantity);
  if (packSize.lte(0)) throw new Error("Package quantity must be greater than zero");
  const packs = Decimal.ceil(required.div(packSize)).toNumber();
  const purchased = packSize.mul(packs);
  return {
    packs,
    purchasedQuantity: purchased,
    leftoverQuantity: purchased.minus(required)
  };
}
