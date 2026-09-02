import Link from "next/link";

export const metadata = {
  title: "Política de privacidad | RevScale Systems",
  description: "Política de privacidad de RevScale Systems, PropertyOS, WhatsApp Business y servicios conectados.",
};

const updatedAt = "1 de septiembre de 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-12 text-[#302d28] md:px-8 md:py-16">
      <article className="mx-auto max-w-4xl rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)] md:p-10">
        <header className="border-b border-[#ddd1c1] pb-7">
          <Link href="/" className="text-sm font-semibold text-[#6d5c45] hover:text-[#302d28]">RevScale Systems</Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Legal · versión 2026-09-01</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Política de privacidad</h1>
          <p className="mt-4 text-sm leading-6 text-[#6d665d]">Última actualización: {updatedAt}</p>
        </header>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-[#554f47]">
          <Section title="1. Alcance"><p>Esta Política explica cómo RevScale Systems (“RevScale”) trata información cuando una persona usa RevScale PropertyOS, nuestros sitios públicos, formularios, demos o funcionalidades conectadas, incluida la integración con WhatsApp Business.</p></Section>

          <Section title="2. Quién decide el tratamiento"><p>Cuando una inmobiliaria u otra organización cliente incorpora a RevScale datos de sus leads, clientes, propiedades o conversaciones, esa organización determina normalmente los fines comerciales principales del tratamiento y RevScale actúa como proveedor tecnológico que procesa la información para prestar las funciones contratadas.</p><p className="mt-3">RevScale puede actuar por cuenta propia respecto de datos necesarios para administrar cuentas, seguridad, facturación, soporte, prevención de fraude, cumplimiento, funcionamiento del servicio y marketing propio de RevScale. Si una solicitud se refiere a datos controlados por una organización cliente, podemos coordinarla con esa organización.</p></Section>

          <Section title="3. Información que podemos tratar"><p>Según las funciones utilizadas, podemos tratar datos de cuenta y organización, como nombre, correo, teléfono, rol y membresía; datos comerciales de leads y clientes, como nombre, teléfono, correo, consulta, preferencias inmobiliarias, etapa comercial y seguimientos; información de propiedades y actividad; contenido y metadatos de mensajes; información de suscripción y estado de pagos; identificadores técnicos de integraciones; y datos básicos de seguridad, sesión y auditoría.</p><p className="mt-3">Los datos pueden ser ingresados por usuarios de RevScale, enviados directamente por personas mediante formularios o WhatsApp, importados legítimamente por una organización cliente o recibidos desde proveedores integrados cuando esa organización habilita la conexión.</p></Section>

          <Section title="4. Finalidades y fundamento"><p>Tratamos información para prestar y operar RevScale; organizar leads y conversaciones; realizar matching inmobiliario; ejecutar seguimientos y automatizaciones configuradas; mostrar métricas; administrar cuentas y suscripciones; brindar soporte; prevenir abuso; proteger el servicio; atender solicitudes; cumplir obligaciones aplicables y mejorar confiabilidad.</p><p className="mt-3">Según el caso, el tratamiento puede apoyarse en la ejecución de una relación contractual, el consentimiento de la persona, el cumplimiento de obligaciones legales o intereses legítimos compatibles con la operación y seguridad del servicio, siempre sujeto a los derechos y límites previstos por la normativa aplicable.</p></Section>

          <Section title="5. Formularios y consentimiento de contacto"><p>Los formularios públicos explican para qué se solicitan los datos antes de enviarlos. Cuando una persona remite una consulta, registramos la versión del aviso aceptado y evidencia de esa aceptación. La autorización para recibir contacto por WhatsApp se solicita de forma separada y opcional cuando corresponde.</p><p className="mt-3">Aceptar que una inmobiliaria responda una consulta no equivale automáticamente a aceptar campañas masivas o publicidad futura. Las organizaciones clientes deben respetar el alcance de la autorización obtenida y cualquier revocación posterior.</p></Section>

          <Section title="6. WhatsApp Business y Meta"><p>Cuando una organización conecta WhatsApp Business, RevScale puede recibir mensajes, estados de entrega e identificadores necesarios para mostrar conversaciones, crear o actualizar leads y permitir respuestas. RevScale no vende datos obtenidos mediante WhatsApp ni utiliza conversaciones privadas de clientes para publicidad propia.</p><p className="mt-3">Cada organización es responsable de contar con las autorizaciones y bases legítimas requeridas para iniciar comunicaciones y de cumplir las reglas vigentes de Meta y WhatsApp, incluidos los requisitos aplicables a mensajes iniciados por la empresa, plantillas, preferencias y bajas.</p></Section>

          <Section title="7. Cookies y medición publicitaria"><p>Usamos almacenamiento estrictamente necesario para funciones como sesión, seguridad y preferencias. En páginas públicas podemos ofrecer medición publicitaria opcional, por ejemplo Meta Pixel. Esa medición solo se carga después de una aceptación explícita y no se activa dentro de áreas autenticadas de PropertyOS.</p><p className="mt-3">Rechazar la medición opcional no impide utilizar el sitio. Las preferencias se pueden modificar posteriormente desde el control de cookies. Más información en nuestra <Link href="/cookies" className="font-semibold text-[#6d5c45] underline underline-offset-4">Política de cookies</Link>.</p></Section>

          <Section title="8. Funciones de inteligencia artificial"><p>Cuando una organización habilita funciones de IA, RevScale puede enviar al proveedor de IA fragmentos relevantes de una conversación, información comercial del lead y contexto limitado de propiedades para clasificar una consulta, sugerir una respuesta o asistir en la operación. Procuramos limitar el contexto a lo necesario para la función solicitada.</p><p className="mt-3">Las funciones de IA son de asistencia y están diseñadas para permitir revisión o derivación humana en asuntos sensibles, jurídicos, de negociación o de baja confianza. La organización usuaria sigue siendo responsable de las decisiones comerciales que adopta.</p></Section>

          <Section title="9. Proveedores, subprocesadores y transferencias"><p>Podemos utilizar proveedores de infraestructura, alojamiento, base de datos, autenticación, pagos, mensajería, analítica operativa, medición publicitaria e inteligencia artificial. Entre ellos pueden encontrarse Supabase, Vercel, Paddle, Meta/WhatsApp y OpenAI cuando la función correspondiente esté habilitada.</p><p className="mt-3">Algunos proveedores pueden tratar información fuera de Uruguay. Cuando resulte aplicable, procuramos utilizar proveedores y mecanismos contractuales o de protección adecuados al tipo de dato y al servicio. No vendemos información personal.</p></Section>

          <Section title="10. Conservación"><p>Conservamos la información durante el tiempo necesario para prestar el servicio y durante períodos adicionales razonables para seguridad, resolución de incidencias, facturación, defensa de derechos o cumplimiento. La duración concreta depende de la naturaleza del dato, la relación con la organización cliente y las obligaciones aplicables.</p><p className="mt-3">Cuando corresponde una eliminación, los datos se eliminan o anonimizan de los sistemas activos, sin perjuicio de ciclos técnicos de respaldo y retenciones que deban mantenerse por seguridad o exigencia legal.</p></Section>

          <Section title="11. Seguridad"><p>Aplicamos medidas técnicas y organizativas orientadas a proteger la información, incluyendo aislamiento por organización, controles de autorización, Row Level Security, registros de auditoría, validación de webhooks, protección de credenciales y secretos de backend, controles de acceso y mecanismos contra abuso.</p><p className="mt-3">Ningún sistema puede garantizar riesgo cero. Si detectamos un incidente relevante, actuaremos de acuerdo con su naturaleza y las obligaciones aplicables.</p></Section>

          <Section title="12. Derechos, revocación y solicitudes"><p>Las personas pueden solicitar, según corresponda, acceso, rectificación, actualización, inclusión, supresión u otras medidas respecto de sus datos y retirar consentimientos previamente otorgados, sin afectar el tratamiento que ya hubiese sido legítimo antes de la revocación. Podemos solicitar verificación razonable de identidad.</p><p className="mt-3">Las instrucciones para solicitar supresión están disponibles en <Link href="/data-deletion" className="font-semibold text-[#6d5c45] underline underline-offset-4">Eliminación de datos</Link>. Si los datos pertenecen a una base gestionada por una inmobiliaria cliente, RevScale puede remitir o coordinar la solicitud con esa organización.</p></Section>

          <Section title="13. Menores"><p>RevScale es un producto empresarial y no está dirigido intencionalmente a menores de edad. Las organizaciones no deben ingresar deliberadamente datos de menores salvo que cuenten con una base jurídica válida y resulte necesario para una finalidad legítima.</p></Section>

          <Section title="14. Cambios a esta política"><p>Podemos actualizar esta Política para reflejar cambios en el producto, proveedores o requisitos legales. Publicaremos la versión vigente en esta misma URL e indicaremos su fecha y versión. Cuando un cambio requiera una nueva aceptación, podremos solicitarla dentro del producto.</p></Section>

          <Section title="15. Contacto"><p>Mientras se completa la configuración del dominio corporativo, las consultas de privacidad pueden enviarse a <a href="mailto:rominamendez456@gmail.com" className="font-semibold text-[#6d5c45] underline underline-offset-4">rominamendez456@gmail.com</a>. Este dato será reemplazado por el canal corporativo cuando esté disponible.</p></Section>
        </div>

        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#ddd1c1] pt-6 text-sm text-[#6d665d]">
          <Link href="/terms" className="hover:text-[#302d28]">Condiciones del servicio</Link>
          <Link href="/cookies" className="hover:text-[#302d28]">Política de cookies</Link>
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
