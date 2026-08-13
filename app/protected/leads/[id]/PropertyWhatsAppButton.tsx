"use client";

import { useState } from "react";
import { generatePropertyWhatsApp } from "./match-actions";


export default function PropertyWhatsAppButton({
  leadId,
  propertyId,
  phone,
}: {
  leadId:string;
  propertyId:string;
  phone?:string | null;
}) {


  const [loading,setLoading] =
    useState(false);



  async function sendProperty(){


    setLoading(true);



    const message =
      await generatePropertyWhatsApp(
        leadId,
        propertyId
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
      mt-4
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
        "Generando..."
        :
        "💬 Enviar por WhatsApp"
      }


    </button>

  );

}