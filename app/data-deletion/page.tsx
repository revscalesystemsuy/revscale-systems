import Link from "next/link";

export const metadata = {
  title: "Eliminación de datos | RevScale Systems",
  description: "Instrucciones para solicitar la eliminación de datos en RevScale Systems.",
};

const updatedAt = "27 de agosto de 2026";

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-12 text-[#302d28] md:px-8 md:py-16">
      <article className="mx-auto max-w-4xl rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)] md:p-10">
        <header className="border-b border-[#ddd1c1] pb-7">
          <Link href="/" className="text-sm font-semibold text-[#6d5c45] hover:text-[#302d28]">RevScale Systems</Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Privacidad</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Eliminación de datos</h1>
          <p className="mt-4 text-sm leading-6 text-[#6d665d]">Última actualización: {updatedAt}</p>
        </header>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-[#554f47]">
          <Section title="Cómo solicitar la eliminación">
            <p>Para solicitar la eliminación de datos personales asociados a RevScale Systems, enviá un correo a <a href="mailto:rominamendez456@gmail.com" className="font-semibold text-[#6d5c45] underline underline-offset-4">rominamendez456@gmail.com</a> con el asunto <strong>Solicitud de eliminación de datos</strong>.</p>
            <p className="mt-3">En el mensaje incluí la información mínima necesaria para identificar los datos que querés eliminar, por ejemplo tu nombre, número de teléfono o correo utilizado con la inmobiliaria o cuenta correspondiente. No envíes contraseñas, tokens ni información innecesariamente sensible.</p>
          </Section>

          <Section title="Si tus datos llegaron mediante WhatsApp">
            <p>Si contactaste por WhatsApp a una organización que utiliza RevScale, indicá el número de WhatsApp desde el que escribiste y, si lo conocés, el nombre de la inmobiliaria. Eso nos permite localizar el lead, la conversación y los mensajes asociados a esa organización.</p>
          </Section>

          <Section title="Verificación de identidad">
            <p>Podemos pedir información razonable para confirmar que la solicitud corresponde a la persona afectada o a un representante autorizado. Esta verificación busca evitar la eliminación fraudulenta de información de terceros.</p>
          </Section>

          <Section title="Qué puede eliminarse">
            <p>Según el caso, la eliminación puede comprender datos de perfil, datos de contacto, leads, conversaciones y mensajes, interacciones comerciales y otros registros directamente vinculados a la persona solicitante.</p>
          </Section>

          <Section title="Excepciones y conservación limitada">
            <p>Determinada información puede conservarse temporalmente cuando resulte necesaria para seguridad, prevención de fraude, resolución de disputas, cumplimiento de obligaciones legales, defensa de derechos o ciclos técnicos de respaldo. Cuando no sea necesaria su identificación directa, procuraremos eliminarla o anonimizarla.</p>
          </Section>

          <Section title="Datos controlados por una organización cliente">
            <p>En algunos casos, la organización inmobiliaria que utiliza RevScale decide los fines y medios principales del tratamiento de los datos de sus leads. Podemos coordinar la solicitud con esa organización cuando sea necesario para tramitarla correctamente.</p>
          </Section>

          <Section title="Plazo de respuesta">
            <p>Confirmaremos la recepción de la solicitud y la atenderemos dentro de un plazo razonable, sujeto a verificación de identidad, complejidad de la solicitud y obligaciones aplicables.</p>
          </Section>

          <Section title="Más información">
            <p>Para conocer con más detalle cómo tratamos información, consultá nuestra <Link href="/privacy" className="font-semibold text-[#6d5c45] underline underline-offset-4">Política de privacidad</Link>.</p>
          </Section>
        </div>

        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#ddd1c1] pt-6 text-sm text-[#6d665d]">
          <Link href="/privacy" className="hover:text-[#302d28]">Política de privacidad</Link>
          <Link href="/terms" className="hover:text-[#302d28]">Condiciones del servicio</Link>
          <Link href="/" className="hover:text-[#302d28]">Volver a RevScale</Link>
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-2xl font-medium text-[#37322b]">{title}</h2><div className="mt-3">{children}</div></section>;
}
