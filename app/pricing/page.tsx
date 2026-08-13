import Link from "next/link";



export default function PricingPage() {



  const plans = [


    {
      name:"STARTER",

      title:"Starter",

      price:"99",

      description:
        "Para inmobiliarias pequeñas que quieren ordenar sus ventas.",

      features:[
        "3 agentes",
        "500 leads",
        "100 propiedades",
        "WhatsApp IA",
        "Follow-ups automáticos"
      ]

    },





    {
      name:"PROFESSIONAL",

      title:"Professional",

      price:"249",

      description:
        "Para equipos comerciales que quieren crecer con IA.",

      popular:true,

      features:[
        "15 agentes",
        "Leads ilimitados",
        "Matching IA",
        "Analytics avanzado",
        "Reportes comerciales"
      ]

    },





    {
      name:"ENTERPRISE",

      title:"Enterprise",

      price:"499",

      description:
        "Para inmobiliarias grandes.",

      features:[
        "Agentes ilimitados",
        "Multi equipo",
        "Integraciones",
        "Soporte prioritario"
      ]

    }


  ];









  return (

    <main className="
    min-h-screen
    bg-slate-950
    p-8
    text-white
    ">


      <div className="
      mx-auto
      max-w-6xl
      ">







        <div className="text-center">


          <p className="
          text-sm
          font-semibold
          text-blue-400
          ">

            RevScale AI

          </p>





          <h1 className="
          mt-3
          text-5xl
          font-bold
          ">

            Elegí tu plan

          </h1>






          <p className="
          mt-4
          text-slate-400
          ">

            Inteligencia artificial para equipos inmobiliarios.

          </p>




        </div>









        <section className="
        mt-12
        grid
        gap-6
        md:grid-cols-3
        ">






        {
          plans.map(
            (plan)=>(



              <div
                key={plan.name}
                className={`

                rounded-2xl
                border
                p-6

                ${
                  plan.popular
                  ?
                  "border-blue-500 bg-blue-500/10"
                  :
                  "border-white/10 bg-white/[0.03]"
                }

                `}
              >







                {
                  plan.popular && (


                    <div className="
                    mb-4
                    inline-block
                    rounded-full
                    bg-blue-500
                    px-3
                    py-1
                    text-xs
                    font-semibold
                    ">

                      Más elegido

                    </div>


                  )
                }








                <h2 className="
                text-2xl
                font-bold
                ">

                  {plan.title}

                </h2>







                <p className="
                mt-2
                text-sm
                text-slate-400
                ">

                  {plan.description}

                </p>








                <div className="mt-6">


                  <span className="
                  text-5xl
                  font-bold
                  ">

                    ${plan.price}

                  </span>


                  <span className="text-slate-400">

                    /mes

                  </span>


                </div>








                <ul className="
                mt-6
                space-y-3
                text-sm
                text-slate-300
                ">



                  {
                    plan.features.map(
                      (feature)=>(


                        <li
                          key={feature}
                        >

                          ✓ {feature}

                        </li>


                      )
                    )
                  }



                </ul>









                <Link
                  href={`/request?plan=${plan.name}`}
                  className="
                  mt-8
                  block
                  rounded-xl
                  bg-green-500
                  px-5
                  py-3
                  text-center
                  font-semibold
                  text-white
                  hover:bg-green-400
                  "
                >

                  🚀 Solicitar {plan.title}


                </Link>







              </div>


            )
          )
        }







        </section>







      </div>


    </main>

  );

}