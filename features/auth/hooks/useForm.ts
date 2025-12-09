"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm as useReactHookForm,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { type z } from "zod";

/**
 * Generic form hook that wraps react-hook-form with Zod validation
 * @param schema - Zod schema for validation
 * @param options - Additional react-hook-form options
 * @returns Form instance with validation
 */
export function useForm<
  TSchema extends z.ZodTypeAny,
  TContext = unknown,
  TTransformedValues = z.infer<TSchema>,
>(
  schema: TSchema,
  options?: Omit<
    UseFormProps<z.infer<TSchema> & FieldValues, TContext, TTransformedValues>,
    "resolver"
  >
): UseFormReturn<z.infer<TSchema> & FieldValues, TContext, TTransformedValues> {
  return useReactHookForm<
    z.infer<TSchema> & FieldValues,
    TContext,
    TTransformedValues
  >({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    mode: "onChange",
    ...options,
  });
}
