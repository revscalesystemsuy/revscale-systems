import Link from "next/link";



export default function RequestSuccessPage(){


  const whatsappNumber =
    "59892715418";





  const message =
`Hola RevScale 👋

Acabo de solicitar acceso a la plataforma.

Quiero coordinar una demo y conocer más sobre los planes disponibles.

Gracias.`;





  const whatsappUrl =
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;








  return (

    <main className="
    min-h-screen
    bg-slate-950
    p-8
    text-white
    ">


      <div className="
      mx-auto
      max-w-xl
      text-center
      ">





        <div className="
        mt-20
        rounded-2xl
        border
        border-white/10
        bg-white/[0.03]
        p-10
        ">





          <div className="
          text-5xl
          ">

            🚀

          </div>







          <h1 className="
          mt-5
          text-4xl
          font-bold
          ">

            Solicitud enviada

          </h1>







          <p className="
          mt-4
          text-slate-400
          "
          >

            Recibimos correctamente tus datos.

            Nuestro equipo se pondrá en contacto para coordinar la activación de tu cuenta.

          </p>








          <a
            href={whatsappUrl}
            target="_blank"
            className="
            mt-8
            block
            rounded-xl
            bg-green-500
            px-6
            py-3
            font-semibold
            text-white
            hover:bg-green-400
            "
          >

            💬 Hablar por WhatsApp

          </a>








          <Link
            href="/"
            className="
            mt-5
            block
            text-sm
            text-blue-400
            hover:text-blue-300
            "
          >

            Volver al inicio

          </Link>







        </div>





      </div>


    </main>

  );

}