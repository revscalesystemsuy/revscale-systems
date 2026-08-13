"use server";

import { createClient } from "@/lib/supabase/server";



// =================================
// MATCHING DESDE FORM
// =================================

export async function findMatchingProperties(
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


  return getMatchingProperties(
    leadId
  );

}






// =================================
// MATCHING IA V3
// =================================


export async function getMatchingProperties(
  leadId:string
) {


  const supabase =
    await createClient();







  const { data: lead } =
    await supabase
      .from("leads")
      .select(
        `
        property_type,
        operation,
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







  if(!lead){

    return [];

  }








  const { data: properties } =
    await supabase
      .from("properties")
      .select(
        `
        id,
        title,
        property_type,
        operation,
        zone,
        price,
        currency,
        bedrooms,
        address,
        status
        `
      )
      .limit(50);








  const matches =
    properties
    ?.map((property)=>{


      let score = 0;


      const reasons:string[] = [];







      // ==========================
      // TIPO
      // ==========================


      if(
        property.property_type ===
        lead.property_type
      ){

        score += 20;


        reasons.push(
          "✓ Tipo de propiedad coincide"
        );

      }







      // ==========================
      // OPERACIÓN
      // ==========================


      if(
        property.operation ===
        lead.operation
      ){

        score += 15;


        reasons.push(
          "✓ Misma operación"
        );

      }







      // ==========================
      // MONEDA
      // ==========================


      if(
        property.currency ===
        lead.currency
      ){

        score += 15;


        reasons.push(
          "✓ Misma moneda"
        );

      }








      // ==========================
      // ZONA
      // ==========================


      if(
        property.zone ===
        lead.primary_zone
      ){

        score += 25;


        reasons.push(
          "✓ Zona coincide exactamente"
        );

      }








      // ==========================
      // PRECIO
      // ==========================


      if(
        property.price &&
        lead.budget_max
      ){


        const ratio =
          Number(property.price) /
          Number(lead.budget_max);





        if(
          ratio <= 1 &&
          ratio >= 0.75
        ){

          score += 20;


          reasons.push(
            "✓ Precio ideal para presupuesto"
          );


        }
        else if(
          ratio <= 1
        ){

          score += 10;


          reasons.push(
            "✓ Precio dentro del presupuesto"
          );

        }

      }








      // ==========================
      // DORMITORIOS
      // ==========================


      if(
        property.bedrooms &&
        lead.bedrooms_min &&
        property.bedrooms >= lead.bedrooms_min
      ){

        score += 10;


        reasons.push(
          "✓ Dormitorios compatibles"
        );

      }








      // ==========================
      // DISPONIBILIDAD
      // ==========================


      if(
        property.status === "AVAILABLE"
      ){

        score += 5;


        reasons.push(
          "✓ Propiedad disponible"
        );

      }







      return {

        ...property,


        compatibility:
          Math.min(
            score,
            100
          ),


        reasons

      };


    })
    .filter(
      item =>
        item.compatibility >= 50
    )
    .sort(
      (a,b)=>
        b.compatibility -
        a.compatibility
    )
    .slice(
      0,
      5
    );







  return matches || [];

}









// =================================
// GENERAR WHATSAPP DE PROPIEDAD
// =================================


export async function generatePropertyWhatsApp(
  leadId:string,
  propertyId:string
) {


  const supabase =
    await createClient();







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







  if(
    !lead ||
    !property
  ){

    throw new Error(
      "Datos no encontrados"
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