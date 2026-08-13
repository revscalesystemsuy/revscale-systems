"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";


export async function completeFollowup(formData: FormData) {

  const id = String(formData.get("id") || "");


  if (!id) {
    return;
  }


  const supabase = await createClient();


  const { error } = await supabase
    .from("followups")
    .update({
      status: "COMPLETED",
      completed_at: new Date().toISOString(),
    })
    .eq("id", id);



  if (error) {
    throw new Error(error.message);
  }


  revalidatePath("/protected/followups");

}