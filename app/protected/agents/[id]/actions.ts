"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";


export async function createLeadFollowup(
  formData: FormData
) {


  const leadId =
    String(
      formData.get("lead_id") || ""
    );



  if (!leadId) {

    throw new Error(
      "Lead inválido"
    );

  }





  const supabase =
    await createClient();





  const { data: claimsData } =
    await supabase.auth.getClaims();



  const userId =
    claimsData?.claims?.sub;



  if (!userId) {

    throw new Error(
      "Usuario no autenticado"
    );

  }





  const { data: member } =
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





  if (!member) {

    throw new Error(
      "Sin organización"
    );

  }






  const { error } =
    await supabase
      .from("followups")
      .insert({

        organization_id:
          member.organization_id,


        lead_id:
          leadId,


        assigned_to:
          userId,


        title:
          "Agendar visita",


        notes:
          "Seguimiento generado por AI Sales Assistant",


        due_at:
          new Date(
            Date.now() + 86400000
          ).toISOString(),


        priority:
          "HIGH",


        status:
          "PENDING"


      });






  if (error) {

    throw new Error(
      error.message
    );

  }







  revalidatePath(
    `/protected/leads/${leadId}`
  );


  revalidatePath(
    "/protected/followups"
  );


}