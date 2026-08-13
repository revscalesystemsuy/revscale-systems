"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";



export async function inviteAgent(formData: FormData) {


  const name = String(
    formData.get("name") || ""
  );


  const email = String(
    formData.get("email") || ""
  );


  const phone = String(
    formData.get("phone") || ""
  );


  const role = String(
    formData.get("role") || "AGENT"
  );



  if (!name || !email) {

    throw new Error(
      "Nombre y email son obligatorios"
    );

  }




  const supabase = await createClient();




  const { data: claimsData } =
    await supabase.auth.getClaims();



  const userId =
    claimsData?.claims?.sub;




  if (!userId) {

    throw new Error(
      "Usuario no autenticado"
    );

  }





  const { data: membership } =
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





  if (!membership) {

    throw new Error(
      "No pertenece a una organización"
    );

  }






  const { data: subscription } =
    await supabase
      .from("subscriptions")
      .select(
        `
        max_agents
        `
      )
      .eq(
        "organization_id",
        membership.organization_id
      )
      .single();






  const { count: currentAgents } =
    await supabase
      .from("organization_members")
      .select(
        "id",
        {
          count:"exact",
          head:true
        }
      )
      .eq(
        "organization_id",
        membership.organization_id
      )
      .eq(
        "status",
        "ACTIVE"
      );






  if (
    subscription &&
    currentAgents !== null &&
    currentAgents >= subscription.max_agents
  ) {

    throw new Error(
      "Tu plan alcanzó el límite de agentes activos."
    );

  }






  const admin = createAdminClient();






  const { data: createdUser, error:userError } =
    await admin.auth.admin.createUser({

      email,

      password:"Welcome123!",

      email_confirm:true,

    });






  if(userError){

    throw new Error(
      userError.message
    );

  }






  if(!createdUser.user){

    throw new Error(
      "No se pudo crear usuario"
    );

  }






  const newUserId =
    createdUser.user.id;






  const { error:profileError } =
    await admin
      .from("profiles")
      .insert({

        id:newUserId,

        full_name:name,

        phone:phone || null,

      });






  if(profileError){

    await admin.auth.admin.deleteUser(
      newUserId
    );


    throw new Error(
      profileError.message
    );

  }







  const { error:memberError } =
    await admin
      .from("organization_members")
      .insert({

        organization_id:
          membership.organization_id,


        user_id:
          newUserId,


        role,


        status:"ACTIVE",

      });






  if(memberError){

    await admin.auth.admin.deleteUser(
      newUserId
    );


    throw new Error(
      memberError.message
    );

  }





  revalidatePath(
    "/protected/agents"
  );

}







// =================================
// EDITAR AGENTE
// =================================


export async function updateAgent(
formData: FormData
) {


  const id = String(
    formData.get("id") || ""
  );


  const name = String(
    formData.get("name") || ""
  );


  const phone = String(
    formData.get("phone") || ""
  );


  const role = String(
    formData.get("role") || "AGENT"
  );





  if(!id){

    throw new Error(
      "Agente inválido"
    );

  }





  const supabase = await createClient();





  const { data: member } =
    await supabase
      .from("organization_members")
      .select(
        `
        user_id
        `
      )
      .eq(
        "id",
        id
      )
      .single();






  if(!member){

    throw new Error(
      "No existe el agente"
    );

  }






  const admin = createAdminClient();







  const { error:profileError } =
    await admin
      .from("profiles")
      .update({

        full_name:name,

        phone:phone || null,

      })
      .eq(
        "id",
        member.user_id
      );






  if(profileError){

    throw new Error(
      profileError.message
    );

  }






  const { error:roleError } =
    await admin
      .from("organization_members")
      .update({

        role,

      })
      .eq(
        "id",
        id
      );






  if(roleError){

    throw new Error(
      roleError.message
    );

  }






  revalidatePath(
    "/protected/agents"
  );


  revalidatePath(
    `/protected/agents/${id}/edit`
  );

}







// =================================
// ACTIVAR / SUSPENDER AGENTE
// =================================


export async function toggleAgentStatus(
formData: FormData
) {


  const id = String(
    formData.get("id") || ""
  );


  const status = String(
    formData.get("status") || ""
  );





  if(!id || !status){

    throw new Error(
      "Datos inválidos"
    );

  }





  const supabase = await createClient();





  const admin = createAdminClient();







  // Si está intentando activar
  // validamos límite del plan

  if(status === "ACTIVE"){



    const { data: member } =
      await supabase
        .from("organization_members")
        .select(
          `
          organization_id
          `
        )
        .eq(
          "id",
          id
        )
        .single();




    if(member){



      const { data: subscription } =
        await supabase
          .from("subscriptions")
          .select(
            `
            max_agents
            `
          )
          .eq(
            "organization_id",
            member.organization_id
          )
          .single();





      const { count: activeAgents } =
        await supabase
          .from("organization_members")
          .select(
            "id",
            {
              count:"exact",
              head:true
            }
          )
          .eq(
            "organization_id",
            member.organization_id
          )
          .eq(
            "status",
            "ACTIVE"
          );





      if(
        subscription &&
        activeAgents !== null &&
        activeAgents >= subscription.max_agents
      ){

        throw new Error(
          "Tu plan no permite activar más agentes."
        );

      }


    }


  }







  const { error } =
    await admin
      .from("organization_members")
      .update({

        status,

      })
      .eq(
        "id",
        id
      );







  if(error){

    throw new Error(
      error.message
    );

  }






  revalidatePath(
    "/protected/agents"
  );

}