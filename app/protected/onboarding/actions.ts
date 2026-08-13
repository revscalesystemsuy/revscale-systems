"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";



export async function completeOnboarding(){


  const supabase =
    await createClient();




  const { data: claimsData } =
    await supabase.auth.getClaims();




  const userId =
    claimsData?.claims?.sub;





  if(!userId){

    redirect("/auth/login");

  }








  const { data: membership, error } =
    await supabase
      .from("organization_members")
      .select(
        `
        organization_id
        `
      )
      .eq(
        "user_id",
        userId
      )
      .single();







  if(error || !membership){

    throw new Error(
      "No se encontró la organización"
    );

  }








  const { data: onboarding } =
    await supabase
      .from("organization_onboarding")
      .select(
        "id"
      )
      .eq(
        "organization_id",
        membership.organization_id
      )
      .maybeSingle();









  if(onboarding){


    await supabase
      .from("organization_onboarding")
      .update({

        completed:true

      })
      .eq(
        "organization_id",
        membership.organization_id
      );



  }else{


    await supabase
      .from("organization_onboarding")
      .insert({

        organization_id:
          membership.organization_id,

        completed:true

      });


  }








  revalidatePath(
    "/protected"
  );


  redirect(
    "/protected"
  );

}