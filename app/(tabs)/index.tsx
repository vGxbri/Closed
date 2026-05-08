import { Redirect } from "expo-router";

// This file is hidden from tabs but expo-router requires it
// Redirect to home/index
export default function TabIndex() {
  return <Redirect href={"/groups" as any} />;
}

