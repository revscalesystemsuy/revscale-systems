"use server";

import { createClient } from "@/lib/supabase/server";



// =================================
// GENERAR MENSAJE DE PROPIEDAD
// =================================

export async function generatePropertyMessage(
  propertyId:string,
  leadId:string
) {


  const supabase =
    await createClient();





  const { data: property } =
    await supabase
      .from("properties")
      .select(
        `
        title,
        zone,
        price,
        currency,
        bedrooms
        `
      )
      .eq(
        "id",
        propertyId
      )
      .single();






  const { data: lead } =
    await supabase
      .from("leads")
      .select(
        `
        full_name
        `
      )
      .eq(
        "id",
        leadId
      )
      .single();







  if(!property || !lead){

    throw new Error(
      "Datos faltantes"
    );

  }







  const message = `Hola ${
    lead.full_name || "cliente"
  } 👋

Encontré una propiedad que puede interesarte:

🏠 ${property.title}

📍 ${property.zone}

💰 ${property.currency} ${Number(
  property.price
).toLocaleString()}

🛏 ${property.bedrooms} dormitorios

¿Coordinamos una visita?`;







  return message;

}








// =================================
// GUARDAR ENVÍO DE PROPIEDAD
// EN HISTORIAL DEL LEAD
// =================================

export async function savePropertyInteraction(
  leadId:string,
  propertyId:string,
  message:string
) {


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


        property_id:
          propertyId,


        channel:
          "WHATSAPP",


        direction:
          "OUTBOUND",


        actor:
          "AI",


        message,


        ai_response:
          "Propiedad enviada por AI Sales Assistant",


        detected_intent:
          "ENVIAR_PROPIEDAD"

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

}