import Link from "next/link";

export const metadata = {
  title: "Política de privacidad | RevScale Systems",
  description: "Política de privacidad de RevScale Systems y su integración con WhatsApp Business.",
};

const updatedAt = "29 de agosto de 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-12 text-[#302d28] md:px-8 md:py-16">
      <article className="mx-auto max-w-4xl rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)] md:p-10">
        <header className="border-b border-[#ddd1c1] pb-7">
          <Link href="/" className="text-sm font-semibold text-[#6d5c45] hover:text-[#302d28]">RevScale Systems</Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Legal</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Política de privacidad</h1>
          <p className="mt-4 text-sm leading-6 text-[#6d665d]">Última actualización: {updatedAt}</p>
        </header>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-[#554f47]">
          <Section title="1. Alcance"><p>Esta Política explica cómo RevScale Systems (“RevScale”) trata información cuando una persona usa nuestra plataforma, nuestros sitios públicos o funcionalidades conectadas, incluida la integración con WhatsApp Business.</p></Section>
          <Section title="2. Información que podemos tratar"><p>Según las funciones utilizadas, podemos tratar datos de cuenta y organización, como nombre, correo, teléfono, rol y membresía; datos comerciales de leads y clientes, como nombre, teléfono, correo, consulta, preferencias inmobiliarias, etapa comercial y seguimientos; información de propiedades y actividad; contenido y metadatos de mensajes; identificadores técnicos de integraciones; y datos básicos de seguridad, sesión y auditoría.</p><p className="mt-3">Los datos pueden ser ingresados por usuarios de RevScale, enviados por clientes potenciales mediante formularios o WhatsApp, o recibidos desde proveedores integrados cuando la organización habilita esas conexiones.</p></Section>
          <Section title="3. Para qué usamos la información"><p>Usamos la información para prestar y operar RevScale, organizar leads y conversaciones, realizar matching inmobiliario, permitir seguimientos y automatizaciones configuradas por la organización, mostrar métricas operativas, brindar soporte, prevenir abuso, proteger cuentas, cumplir obligaciones aplicables y mejorar la confiabilidad del servicio.</p></Section>
          <Section title="4. WhatsApp Business y Meta"><p>Cuando una organización conecta WhatsApp Business, RevScale puede recibir mensajes, estados de entrega e identificadores necesarios para mostrar conversaciones, crear o actualizar leads y permitir respuestas de la organización. RevScale no vende datos obtenidos mediante WhatsApp ni utiliza esos datos para publicidad propia.</p><p className="mt-3">El uso de WhatsApp también está sujeto a las políticas y condiciones aplicables de Meta y WhatsApp. Cada organización es responsable de contar con las autorizaciones y bases legítimas necesarias para comunicarse con sus contactos.</p></Section>
          <Section title="5. Medición publicitaria opcional"><p>En los sitios públicos podemos ofrecer medición publicitaria opcional, por ejemplo mediante Meta Pixel, para conocer de forma agregada si páginas, demos o recursos contribuyen a generar interés comercial y para crear audiencias de retargeting. Esta medición se carga únicamente después de una aceptación explícita y no se activa en áreas autenticadas de la plataforma.</p><p className="mt-3">La persona puede rechazar esta medición sin perder acceso al sitio público. No utilizamos datos de conversaciones privadas de WhatsApp, leads de organizaciones clientes ni información de áreas autenticadas para construir estas audiencias publicitarias.</p></Section>
          <Section title="6. Funciones de inteligencia artificial"><p>Cuando una organización habilita funciones de IA, RevScale puede enviar al proveedor de IA fragmentos relevantes de una conversación, información comercial del lead y contexto limitado de propiedades disponibles para clasificar una consulta, sugerir una respuesta o asistir en la operación. Las funciones de IA están diseñadas para derivar a una persona asuntos sensibles, legales, de negociación o de baja confianza.</p></Section>
          <Section title="7. Proveedores y transferencias"><p>Podemos utilizar proveedores de infraestructura, alojamiento, base de datos, autenticación, mensajería, analítica operativa, medición publicitaria e inteligencia artificial exclusivamente para prestar las funciones habilitadas. Entre ellos pueden encontrarse Supabase, Vercel, Meta/WhatsApp y OpenAI cuando corresponda.</p><p className="mt-3">No vendemos información personal. Podemos revelar información cuando sea razonablemente necesario para cumplir una obligación legal, proteger la seguridad del servicio o ejercer derechos legítimos.</p></Section>
          <Section title="8. Conservación"><p>Conservamos la información mientras la cuenta u organización se encuentre activa y durante el tiempo razonablemente necesario para prestar el servicio, resolver incidencias, mantener registros de seguridad o cumplir obligaciones aplicables. Cuando corresponde una eliminación, los datos se eliminan o anonimizan de los sistemas activos, sin perjuicio de ciclos técnicos de respaldo y retenciones legalmente exigibles.</p></Section>
          <Section title="9. Seguridad"><p>Aplicamos medidas técnicas y organizativas orientadas a proteger la información, incluyendo controles de acceso por organización, políticas de autorización, aislamiento de datos, validación de webhooks y almacenamiento de credenciales sensibles únicamente en secretos de backend.</p></Section>
          <Section title="10. Derechos y solicitudes"><p>Las personas pueden solicitar acceso, corrección o eliminación de información que les concierna, sujeto a verificación de identidad y a las excepciones aplicables. Las instrucciones específicas para eliminación están disponibles en <Link href="/data-deletion" className="font-semibold text-[#6d5c45] underline underline-offset-4">Eliminación de datos</Link>.</p></Section>
          <Section title="11. Menores"><p>RevScale es un producto empresarial y no está dirigido intencionalmente a menores de edad. Las organizaciones no deben ingresar deliberadamente datos de menores salvo que cuenten con una base legal válida y resulte estrictamente necesario.</p></Section>
          <Section title="12. Cambios a esta política"><p>Podemos actualizar esta Política para reflejar cambios en el producto, proveedores o requisitos legales. Publicaremos la versión vigente en esta misma URL e indicaremos la fecha de actualización.</p></Section>
          <Section title="13. Contacto"><p>Para consultas sobre privacidad o tratamiento de datos, podés escribir a <a href="mailto:rominamendez456@gmail.com" className="font-semibold text-[#6d5c45] underline underline-offset-4">rominamendez456@gmail.com</a>.</p></Section>
        </div>

        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#ddd1c1] pt-6 text-sm text-[#6d665d]">
          <Link href="/terms" className="hover:text-[#302d28]">Condiciones del servicio</Link>
          <Link href="/data-deletion" className="hover:text-[#302d28]">Eliminación de datos</Link>
          <Link href="/" className="hover:text-[#302d28]">Volver a RevScale</Link>
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="font-serif text-2xl font-medium text-[#37322b]">{title}</h2><div className="mt-3">{children}</div></section>;
}
