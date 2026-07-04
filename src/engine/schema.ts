import { z } from "zod";
import { CATEGORIES } from "./types";

const CategorySchema = z.enum(CATEGORIES);

export const CarSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, "kebab-case ids only"),
    make: z.string().min(1),
    model: z.string().min(1),
    trim: z.string().min(1).optional(),
    yearStart: z.number().int().gte(1945).lte(2100),
    yearEnd: z.number().int().gte(1945).lte(2100),
    classes: z.record(CategorySchema, z.string().min(1)),
    verified: z.boolean(),
    notes: z.string().optional(),
  })
  .refine((c) => c.yearEnd >= c.yearStart, {
    message: "yearEnd must be >= yearStart",
  })
  .refine((c) => c.classes.street !== undefined, {
    message: "every car needs at least a Street class (or explicit NOC handling)",
  });

export const ModSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "kebab-case ids only"),
  label: z.string().min(1),
  group: z.enum([
    "tires-wheels",
    "suspension",
    "engine-drivetrain",
    "brakes",
    "body-aero",
    "interior-electrical",
  ]),
  minCategory: CategorySchema,
  ruleRef: z.string().min(1),
  note: z.string().optional(),
  verified: z.boolean(),
});

export const CarsFileSchema = z.array(CarSchema).superRefine((cars, ctx) => {
  const seen = new Set<string>();
  for (const car of cars) {
    if (seen.has(car.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate car id: ${car.id}` });
    }
    seen.add(car.id);
  }
});

export const ModsFileSchema = z.array(ModSchema).superRefine((mods, ctx) => {
  const seen = new Set<string>();
  for (const mod of mods) {
    if (seen.has(mod.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate mod id: ${mod.id}` });
    }
    seen.add(mod.id);
  }
});
