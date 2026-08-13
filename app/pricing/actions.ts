"use server";

import { redirect } from "next/navigation";



export async function selectPlan(
formData:FormData
){


const plan =
String(
formData.get("plan") || ""
);



if(!plan){

throw new Error(
"Plan inválido"
);

}




// después acá conectamos Stripe

console.log(
"PLAN SELECCIONADO:",
plan
);




redirect(
`/auth/login?plan=${plan}`
);


}