import { createContext, useContext } from "react";

export const ToastContext = createContext(null);

// const toast = useToast(); toast.success("..."), toast.error("..."), toast.info("...")
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
