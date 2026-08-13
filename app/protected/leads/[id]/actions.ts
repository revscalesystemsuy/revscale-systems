"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";



// =================================
// CREAR FOLLOWUP DESDE AI ASSISTANT
// =================================

export async function createLeadFollowup(
  formData: FormData
) {


  const leadId = String(
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





  const { data: member, error:memberError } =
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





  if(memberError){

    console.log(
      "MEMBER ERROR:",
      memberError
    );

  }





  if(!member){

    throw new Error(
      "No tiene organización"
    );

  }






  const { data: existingFollowup } =
    await supabase
      .from("followups")
      .select(
        "id"
      )
      .eq(
        "lead_id",
        leadId
      )
      .eq(
        "title",
        "Agendar visita"
      )
      .eq(
        "status",
        "PENDING"
      )
      .maybeSingle();






  if(existingFollowup){

    console.log(
      "FOLLOWUP YA EXISTE:",
      existingFollowup.id
    );


    revalidatePath(
      `/protected/leads/${leadId}`
    );


    revalidatePath(
      "/protected/followups"
    );


    return;

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







  if(error){

    console.log(
      "FOLLOWUP ERROR:",
      error
    );


    throw new Error(
      error.message
    );

  }





  console.log(
    "FOLLOWUP CREADO OK"
  );





  revalidatePath(
    `/protected/leads/${leadId}`
  );


  revalidatePath(
    "/protected/followups"
  );

}








// =================================
// GENERAR MENSAJE WHATSAPP IA
// =================================


export async function generateWhatsAppMessage(
  formData: FormData
) {


  const leadId = String(
    formData.get("lead_id") || ""
  );





  if(!leadId){

    throw new Error(
      "Lead inválido"
    );

  }





  const supabase =
    await createClient();






  const { data: lead, error } =
    await supabase
      .from("leads")
      .select(
        `
        full_name,
        property_type,
        primary_zone,
        budget_max,
        currency,
        bedrooms_min
        `
      )
      .eq(
        "id",
        leadId
      )
      .single();






  if(error){

    throw new Error(
      error.message
    );

  }





  if(!lead){

    throw new Error(
      "No existe el lead"
    );

  }





  const message = `Hola ${
    lead.full_name || "cliente"
  }, vi que estás buscando ${
    lead.property_type || "una propiedad"
  }${
    lead.bedrooms_min
      ? ` de ${lead.bedrooms_min} dormitorios`
      : ""
  } en ${
    lead.primary_zone || "la zona que te interesa"
  }.

Tengo opciones que pueden ajustarse a lo que buscás.

¿Coordinamos una visita?`;






  console.log(
    "WHATSAPP GENERADO:",
    message
  );





  return message;

}








// =================================
// GUARDAR WHATSAPP EN INTERACCIONES
// =================================


export async function saveWhatsAppInteraction(
  formData: FormData
) {


  const leadId = String(
    formData.get("lead_id") || ""
  );


  const message = String(
    formData.get("message") || ""
  );





  if(!leadId || !message){

    throw new Error(
      "Datos incompletos"
    );

  }





  const supabase =
    await createClient();





  const { data: claimsData } =
    await supabase.auth.getClaims();




  const userId =
    claimsData?.claims?.sub;





  if(!userId){

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







  if(!member){

    throw new Error(
      "Sin organización"
    );

  }








  const { error } =
    await supabase
      .from("interactions")
      .insert({

        organization_id:
          member.organization_id,


        lead_id:
          leadId,


        channel:
          "WHATSAPP",


        direction:
          "OUTBOUND",


        actor:
          "AI",


        message,


        ai_response:
          "Mensaje generado por AI Sales Assistant",


        detected_intent:
          "CONTACTAR_LEAD"

      });








  if(error){

    console.log(
      "INTERACTION ERROR:",
      error
    );


    throw new Error(
      error.message
    );

  }






  revalidatePath(
    `/protected/leads/${leadId}`
  );

}