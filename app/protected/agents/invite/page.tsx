import Link from "next/link";
import { inviteAgent } from "../actions";


export default function InviteAgentPage() {


  return (

    <main className="min-h-screen bg-slate-950 p-8 text-white">


      <div className="mx-auto max-w-3xl">



        <Link
          href="/protected/agents"
          className="text-blue-400 hover:text-blue-300"
        >
          ← Volver a Agentes
        </Link>





        <h1 className="mt-6 text-3xl font-bold">
          Invitar agente
        </h1>



        <p className="mt-2 text-slate-400">
          Agrega un nuevo miembro a tu equipo comercial.
        </p>







        <form
          action={inviteAgent}
          className="
          mt-8
          space-y-5
          rounded-2xl
          border
          border-white/10
          bg-white/[0.03]
          p-6
          "
        >





          <div>

            <label className="text-sm text-slate-400">
              Nombre completo
            </label>



            <input

              name="name"

              required

              placeholder="Ej: Juan Pérez"

              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-transparent
              p-3
              "

            />


          </div>







          <div>

            <label className="text-sm text-slate-400">
              Teléfono
            </label>



            <input

              name="phone"

              placeholder="Ej: 099123456"

              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-transparent
              p-3
              "

            />


          </div>







          <div>

            <label className="text-sm text-slate-400">
              Email
            </label>



            <input

              name="email"

              type="email"

              required

              placeholder="agente@email.com"

              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-transparent
              p-3
              "

            />


          </div>







          <div>

            <label className="text-sm text-slate-400">
              Rol
            </label>




            <select

              name="role"

              className="
              mt-2
              w-full
              rounded-xl
              border
              border-white/10
              bg-slate-950
              p-3
              "

            >


              <option value="AGENT">
                Agente
              </option>


              <option value="ADMIN">
                Administrador
              </option>



            </select>



          </div>








          <button

            className="
            rounded-xl
            bg-blue-500
            px-6
            py-3
            font-semibold
            hover:bg-blue-400
            "

          >

            Enviar invitación

          </button>





        </form>




      </div>


    </main>

  );

}