/**
 * Redirección de pestañas principales
 * Redirige la ruta raíz de tabs hacia la sección de grupos.
 */
import { Redirect } from "expo-router";

export default function TabIndex() {
  return <Redirect href={"/groups" as any} />;
}

