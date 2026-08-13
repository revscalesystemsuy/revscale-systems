import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";


export default function PropertiesPage() {

  return (
    <Suspense fallback={<PropertiesSkeleton />}>
      <PropertiesContent />
    </Suspense>
  );

}



async function PropertiesContent() {


  const supabase = await createClient();




  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();




  if (claimsError || !claimsData?.claims) {

    redirect("/auth/login");

  }





  const { data: properties, error } =
    await supabase
      .from("properties")
      .select(
        `
        id,
        title,
        property_type,
        operation,
        zone,
        address,
        price,
        currency,
        bedrooms,
        bathrooms,
        area_m2,
        status,
        description,
        created_at
        `
      )
      .order(
        "created_at",
        {
          ascending:false
        }
      );






  return (

    <main className="min-h-screen p-8">


      <div className="mx-auto max-w-7xl">





        <div className="mb-8 flex items-start justify-between gap-6">


          <div>

            <p className="text-sm font-medium text-blue-400">
              Inventario inmobiliario
            </p>


            <h1 className="mt-1 text-3xl font-bold">
              Propiedades
            </h1>


            <p className="mt-2 text-slate-400">
              Propiedades disponibles dentro de tu organización.
            </p>


          </div>





          <div className="flex items-center gap-3">


            <div className="
            rounded-xl
            border
            border-white/10
            px-5
            py-3
            ">


              <p className="text-xs text-slate-400">
                Total
              </p>


              <p className="text-2xl font-bold">
                {properties?.length ?? 0}
              </p>


            </div>





            <Link
              href="/protected/properties/new"
              className="
              rounded-xl
              bg-blue-500
              px-5
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-blue-400
              "
            >

              + Nueva propiedad

            </Link>



          </div>


        </div>








        {
          error && (

            <div className="
            mb-6
            rounded-xl
            border
            border-red-500/20
            bg-red-500/10
            p-4
            text-red-300
            ">

              No se pudieron cargar las propiedades.

            </div>

          )
        }








        <section className="
        grid
        gap-5
        md:grid-cols-2
        xl:grid-cols-3
        ">



          {
            properties?.map((property)=>(


              <article
                key={property.id}
                className="
                overflow-hidden
                rounded-2xl
                border
                border-white/10
                bg-white/[0.03]
                "
              >



                <div className="
                flex
                h-40
                items-center
                justify-center
                bg-white/[0.03]
                ">

                  <span className="text-sm text-slate-600">
                    Imagen de propiedad
                  </span>

                </div>






                <div className="p-5">



                  <div className="
                  flex
                  items-start
                  justify-between
                  gap-4
                  ">



                    <div>


                      <p className="
                      text-xs
                      font-semibold
                      uppercase
                      tracking-wide
                      text-blue-400
                      ">

                        {property.operation || "SIN OPERACIÓN"}

                      </p>




                      <h2 className="mt-1 text-lg font-bold">

                        {property.title}

                      </h2>



                    </div>






                    <span className="
                    rounded-full
                    bg-white/5
                    px-3
                    py-1
                    text-xs
                    font-semibold
                    text-slate-300
                    ">

                      {property.status}

                    </span>




                  </div>







                  <p className="mt-2 text-sm text-slate-400">

                    {property.zone || "Zona sin definir"}

                  </p>




                  <p className="mt-1 text-xs text-slate-600">

                    {property.address || ""}

                  </p>







                  <div className="
                  mt-5
                  flex
                  flex-wrap
                  gap-3
                  text-sm
                  text-slate-400
                  ">


                    <span>
                      {property.bedrooms ?? "—"} dorm.
                    </span>


                    <span>
                      {property.bathrooms ?? "—"} baños
                    </span>


                    <span>
                      {
                        property.area_m2
                        ? `${property.area_m2} m²`
                        : "— m²"
                      }
                    </span>


                  </div>







                  <div className="
                  mt-5
                  border-t
                  border-white/10
                  pt-4
                  ">


                    <p className="text-xs text-slate-500">
                      Precio
                    </p>


                    <p className="mt-1 text-2xl font-bold">

                      {
                        property.price
                        ?
                        `${property.currency || ""} ${Number(property.price).toLocaleString()}`
                        :
                        "Consultar"
                      }

                    </p>


                  </div>








                  <Link
                    href={`/protected/properties/${property.id}`}
                    className="
                    mt-5
                    block
                    rounded-xl
                    border
                    border-white/10
                    px-4
                    py-2
                    text-center
                    text-sm
                    font-semibold
                    text-blue-400
                    hover:bg-blue-500/10
                    "
                  >

                    Ver detalle

                  </Link>





                </div>




              </article>


            ))
          }





        </section>








        {
          !properties?.length && !error && (

            <div className="
            rounded-2xl
            border-dashed
            border
            border-white/10
            bg-white/[0.02]
            p-14
            text-center
            ">


              <h2 className="text-lg font-semibold">
                Todavía no hay propiedades
              </h2>


              <p className="mt-2 text-sm text-slate-500">
                Creá la primera propiedad de tu inventario.
              </p>


              <Link
                href="/protected/properties/new"
                className="
                mt-6
                inline-block
                rounded-xl
                bg-blue-500
                px-5
                py-3
                text-sm
                font-semibold
                text-white
                hover:bg-blue-400
                "
              >

                + Nueva propiedad

              </Link>


            </div>

          )
        }





      </div>


    </main>

  );

}







function PropertiesSkeleton() {


  return (

    <main className="min-h-screen p-8">


      <div className="
      mx-auto
      max-w-7xl
      animate-pulse
      ">


        <div className="
        h-8
        w-48
        rounded
        bg-white/10
        " />



        <div className="
        mt-8
        grid
        gap-5
        md:grid-cols-2
        xl:grid-cols-3
        ">

          <div className="h-80 rounded-2xl bg-white/5" />

          <div className="h-80 rounded-2xl bg-white/5" />

          <div className="h-80 rounded-2xl bg-white/5" />


        </div>


      </div>


    </main>

  );

}