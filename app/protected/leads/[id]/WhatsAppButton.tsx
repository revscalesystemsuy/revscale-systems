"use client";

import { useState } from "react";
import {
  generateWhatsAppMessage,
  saveWhatsAppInteraction
} from "./actions";


export default function WhatsAppButton({
  leadId,
  phone,
}: {
  leadId:string;
  phone?:string | null;
}) {


  const [message,setMessage] =
    useState("");

  const [loading,setLoading] =
    useState(false);







  async function handleGenerate(){


    setLoading(true);



    const formData =
      new FormData();


    formData.append(
      "lead_id",
      leadId
    );



    const result =
      await generateWhatsAppMessage(
        formData
      );



    setMessage(
      result
    );





    const interactionData =
      new FormData();


    interactionData.append(
      "lead_id",
      leadId
    );


    interactionData.append(
      "message",
      result
    );




    await saveWhatsAppInteraction(
      interactionData
    );



    setLoading(false);

  }







  function copyMessage(){

    navigator.clipboard.writeText(
      message
    );

  }







  function openWhatsApp(){


    const text =
      encodeURIComponent(
        message
      );



    const cleanPhone =
      phone?.replace(/\D/g,"")
      || "";



    const url =
      cleanPhone
      ?
      `https://wa.me/${cleanPhone}?text=${text}`
      :
      `https://wa.me/?text=${text}`;



    window.open(
      url,
      "_blank"
    );


  }









  return (

    <div>


      <button
        onClick={handleGenerate}
        className="
        mt-3
        w-full
        rounded-xl
        border
        border-green-500/30
        px-5
        py-2
        text-sm
        font-semibold
        text-green-400
        hover:bg-green-500/10
        "
      >

        {
          loading
          ?
          "Generando..."
          :
          "💬 Generar WhatsApp"
        }

      </button>








      {
        message &&

        <div
          className="
          mt-4
          rounded-xl
          border
          border-white/10
          bg-white/[0.03]
          p-4
          "
        >


          <p className="text-sm text-slate-400">
            Mensaje sugerido:
          </p>



          <p className="mt-3 text-sm">
            {message}
          </p>





          <div className="mt-4 flex gap-3">


            <button
              onClick={copyMessage}
              className="
              rounded-xl
              border
              border-white/10
              px-4
              py-2
              text-sm
              "
            >

              📋 Copiar

            </button>






            <button
              onClick={openWhatsApp}
              className="
              rounded-xl
              bg-green-500
              px-4
              py-2
              text-sm
              font-semibold
              text-white
              "
            >

              💬 WhatsApp

            </button>



          </div>




        </div>

      }



    </div>

  );

}