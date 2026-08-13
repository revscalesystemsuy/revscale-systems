"use client";

import { useState } from "react";
import {
  generatePropertyMessage,
  savePropertyInteraction
} from "./actions";



export default function PropertySendWhatsAppButton({
  propertyId,
  leadId,
  phone,
}: {
  propertyId:string;
  leadId:string;
  phone?:string | null;
}) {


  const [loading,setLoading] =
    useState(false);





  async function sendProperty(){


    setLoading(true);




    const message =
      await generatePropertyMessage(
        propertyId,
        leadId
      );






    await savePropertyInteraction(
      leadId,
      propertyId,
      message
    );







    const encoded =
      encodeURIComponent(
        message
      );







    const cleanPhone =
      phone?.replace(/\D/g,"")
      || "";







    const url =
      cleanPhone
      ?
      `https://wa.me/${cleanPhone}?text=${encoded}`
      :
      `https://wa.me/?text=${encoded}`;








    window.open(
      url,
      "_blank"
    );






    setLoading(false);


  }







  return (

    <button
      onClick={sendProperty}
      className="
      mt-3
      w-full
      rounded-xl
      bg-green-500
      px-4
      py-2
      text-sm
      font-semibold
      text-white
      hover:bg-green-400
      "
    >


      {
        loading
        ?
        "Enviando..."
        :
        "💬 Enviar propiedad"
      }


    </button>

  );

}