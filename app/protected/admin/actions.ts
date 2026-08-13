"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";



// =================================
// ACTIVAR PLAN
// =================================

export async function activatePlan(
  formData:FormData
){


  const requestId =
    String(
      formData.get("request_id") || ""
    );



  if(!requestId){

    throw new Error(
      "Solicitud inválida"
    );

  }





  const supabase =
    await createClient();






  const { data:request } =
    await supabase
      .from("plan_requests")
      .select(
        `
        id,
        organization_id,
        plan
        `
      )
      .eq(
        "id",
        requestId
      )
      .single();







  if(!request){

    throw new Error(
      "Solicitud no encontrada"
    );

  }








  await supabase
    .from("subscriptions")
    .update({

      plan:
        request.plan,

      status:
        "ACTIVE"

    })
    .eq(
      "organization_id",
      request.organization_id
    );








  await supabase
    .from("plan_requests")
    .update({

      status:
        "ACTIVE"

    })
    .eq(
      "id",
      requestId
    );








  revalidatePath(
    "/protected/admin"
  );


}








// =================================
// RECHAZAR SOLICITUD
// =================================

export async function rejectPlan(
  formData:FormData
){


  const requestId =
    String(
      formData.get("request_id") || ""
    );



  if(!requestId){

    throw new Error(
      "Solicitud inválida"
    );

  }






  const supabase =
    await createClient();






  await supabase
    .from("plan_requests")
    .update({

      status:
        "REJECTED"

    })
    .eq(
      "id",
      requestId
    );







  revalidatePath(
    "/protected/admin"
  );


}