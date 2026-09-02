import Link from "next/link";

export const metadata = {
  title: "Condiciones del servicio | RevScale Systems",
  description: "Condiciones generales de uso, suscripción y facturación de RevScale Systems.",
};

const updatedAt = "1 de septiembre de 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-12 text-[#302d28] md:px-8 md:py-16">
      <article className="mx-auto max-w-4xl rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)] md:p-10">
        <header className="border-b border-[#ddd1c1] pb-7">
          <Link href="/" className="text-sm font-semibold text-[#6d5c45] hover:text-[#302d28]">RevScale Systems</Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Legal · versión 2026-09-01</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Condiciones del servicio</h1>
          <p className="mt-4 text-sm leading-6 text-[#6d665d]">Última actualización: {updatedAt}</p>
        </header>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-[#554f47]">
          <Section title="1. Servicio"><p>RevScale Systems (“RevScale”) ofrece RevScale PropertyOS, una plataforma de operación comercial orientada principalmente a organizaciones inmobiliarias. Las funciones pueden incluir gestión de leads, propiedades, conversaciones, tareas, seguimiento, automatizaciones, analítica, integraciones, documentos y asistencia basada en inteligencia artificial.</p></Section>

          <Section title="2. Aceptación y autoridad"><p>Al crear una cuenta, marcar la aceptación correspondiente o utilizar el servicio, la persona usuaria acepta estas Condiciones y declara tener capacidad para actuar por sí o autorización suficiente para vincular a la organización que representa. RevScale registra la versión de las Condiciones aceptada en los flujos de alta habilitados para ello.</p><p className="mt-3">Cada usuario debe proteger sus credenciales y la organización es responsable de administrar altas, bajas, permisos y dispositivos de su equipo.</p></Section>

          <Section title="3. Uso permitido"><p>RevScale debe utilizarse de forma lícita y profesional. No está permitido utilizar el servicio para fraude, spam, suplantación, acceso no autorizado, contenido ilícito, interferencia con sistemas de terceros, scraping abusivo, campañas sin autorización o tratamiento de datos sin fundamento legítimo.</p></Section>

          <Section title="4. Datos, leads y roles de tratamiento"><p>La organización cliente conserva la responsabilidad por los datos que incorpora, importa o conecta a PropertyOS y por contar con las autorizaciones necesarias para utilizarlos. En relación con los datos comerciales de sus leads y clientes, la organización determina normalmente los fines principales y RevScale procesa la información como proveedor tecnológico para prestar las funciones contratadas.</p><p className="mt-3">RevScale puede tratar por cuenta propia los datos necesarios para cuentas, seguridad, soporte, facturación, prevención de fraude, cumplimiento y funcionamiento del servicio, según nuestra <Link href="/privacy" className="font-semibold text-[#6d5c45] underline underline-offset-4">Política de privacidad</Link>.</p></Section>

          <Section title="5. WhatsApp, Meta y comunicaciones"><p>La organización es responsable de respetar las reglas de Meta/WhatsApp y de contar con las autorizaciones exigibles antes de iniciar comunicaciones. Una consulta recibida o una conversación previa no debe interpretarse como autorización ilimitada para marketing. Cuando RevScale ofrece un control de consentimiento, la organización debe respetar el alcance registrado, las revocaciones y las preferencias del contacto.</p><p className="mt-3">RevScale puede bloquear o limitar automatizaciones que representen riesgo de spam, abuso, incumplimiento de políticas del proveedor o afectación a la seguridad del servicio.</p></Section>

          <Section title="6. Inteligencia artificial y automatización"><p>Las funciones de IA y automatización son herramientas de asistencia. No sustituyen criterio profesional ni asesoramiento legal, contable, financiero o contractual. La organización debe revisar decisiones sensibles, configurar adecuadamente horarios y reglas, mantener mecanismos de derivación humana y verificar información crítica antes de actuar.</p></Section>

          <Section title="7. Planes, límites y disponibilidad"><p>Las funciones disponibles dependen del plan, límites operativos, integraciones habilitadas y requisitos externos. RevScale puede mejorar o modificar el producto y aplicar límites razonables para preservar seguridad, estabilidad y uso justo. Una función dependiente de un tercero puede quedar temporalmente indisponible por cambios, revisiones o incidentes ajenos a RevScale.</p></Section>

          <Section title="8. Precios, cobros e impuestos"><p>Antes de contratar un plan pago se informa el precio, moneda y ciclo de facturación aplicable. Las suscripciones pueden ser mensuales o anuales y, salvo que se indique expresamente lo contrario, son recurrentes. Cuando Paddle se encuentra habilitado como procesador y Merchant of Record, el cobro, comprobante, impuestos indirectos y determinados aspectos del pago son procesados por Paddle conforme a la información mostrada en checkout y sus condiciones aplicables.</p><p className="mt-3">Los cargos de proveedores externos contratados directamente por la organización —por ejemplo Meta/WhatsApp, portales, firmas o servicios de terceros— no están incluidos salvo indicación expresa.</p></Section>

          <Section title="9. Renovación y cambios de plan"><p>Una suscripción recurrente se renueva al finalizar cada período mientras no exista una cancelación efectiva. La fecha de próxima renovación, ciclo, estado y cambios confirmados por el proveedor se muestran en el área de facturación cuando están disponibles.</p><p className="mt-3">Los upgrades o downgrades pueden producir ajustes o prorrateos según el momento del cambio y las reglas informadas por el proveedor de pagos. RevScale no activa un cambio como definitivo hasta recibir la confirmación correspondiente del sistema de facturación.</p></Section>

          <Section title="10. Cancelación"><p>La organización puede solicitar la cancelación de una suscripción recurrente antes de la próxima renovación desde los mecanismos de facturación que estén habilitados o escribiendo al canal de soporte indicado al final de estas Condiciones. Cuando la cancelación se programa para el final del período, el acceso continúa normalmente hasta esa fecha y no se generan nuevas renovaciones después de que el proveedor confirme la cancelación.</p><p className="mt-3">Una solicitud enviada después de que un nuevo período haya sido cobrado puede quedar sujeta a la política de reembolso aplicable, a las condiciones del proveedor de pagos y a cualquier derecho imperativo que corresponda.</p></Section>

          <Section title="11. Reembolsos y cargos incorrectos"><p>Salvo obligación legal, condición distinta mostrada al contratar o decisión del Merchant of Record, los períodos ya iniciados no generan automáticamente un reembolso proporcional por falta de uso. Las solicitudes por cobros duplicados, errores técnicos, imposibilidad atribuible al servicio u otras circunstancias excepcionales pueden ser revisadas caso a caso.</p><p className="mt-3">Nada de estas Condiciones limita derechos irrenunciables que una persona pueda tener bajo normas de protección al consumidor u otras normas imperativas cuando esas normas resulten aplicables.</p></Section>

          <Section title="12. Suspensión, impago y terminación"><p>Podemos suspender o limitar el acceso por incumplimiento, riesgo de seguridad, abuso, impago, requerimiento legal o necesidad de proteger usuarios y sistemas. Cuando resulte razonablemente posible, procuraremos permitir una salida ordenada y aplicar las reglas de conservación y eliminación descritas en la Política de privacidad.</p></Section>

          <Section title="13. Propiedad intelectual"><p>RevScale, su software, diseño, documentación, marcas y materiales propios pertenecen a sus titulares y están protegidos por la normativa aplicable. El uso del servicio concede únicamente el derecho limitado, no exclusivo y revocable necesario para utilizar PropertyOS durante la relación vigente.</p></Section>

          <Section title="14. Responsabilidad"><p>RevScale es una herramienta tecnológica de apoyo operativo. En la máxima medida permitida por la normativa aplicable, no garantizamos un número específico de ventas, cierres, conversiones ni resultados derivados de automatizaciones, matching, integraciones o sugerencias de IA. La organización debe verificar información crítica antes de adoptar decisiones vinculantes.</p></Section>

          <Section title="15. Normativa aplicable"><p>Estas Condiciones se interpretan de acuerdo con la normativa que resulte aplicable a la relación y, para la operación de RevScale desde Uruguay, con referencia a la legislación uruguaya, sin perjuicio de normas imperativas de otra jurisdicción que no puedan excluirse contractualmente.</p></Section>

          <Section title="16. Cambios"><p>Podemos actualizar estas Condiciones para reflejar cambios de producto, proveedores, modelo comercial o requisitos legales. La versión vigente se publica en esta URL. Cuando un cambio requiera una nueva aceptación, podremos solicitarla expresamente dentro del producto.</p></Section>

          <Section title="17. Contacto"><p>Mientras se completa el dominio corporativo, las consultas de facturación, cancelación o condiciones pueden enviarse a <a href="mailto:rominamendez456@gmail.com" className="font-semibold text-[#6d5c45] underline underline-offset-4">rominamendez456@gmail.com</a>. Este canal será sustituido por el correo corporativo cuando esté disponible.</p></Section>
        </div>

        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#ddd1c1] pt-6 text-sm text-[#6d665d]">
          <Link href="/privacy" className="hover:text-[#302d28]">Política de privacidad</Link>
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
