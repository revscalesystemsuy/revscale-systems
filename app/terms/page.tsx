import Link from "next/link";

export const metadata = {
  title: "Condiciones del servicio | RevScale Systems",
  description: "Condiciones generales de uso de RevScale Systems.",
};

const updatedAt = "27 de agosto de 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#efe6d8] px-6 py-12 text-[#302d28] md:px-8 md:py-16">
      <article className="mx-auto max-w-4xl rounded-2xl border border-[#d5c8b6] bg-[#f7f1e8] p-7 shadow-[0_24px_70px_rgba(70,58,42,.08)] md:p-10">
        <header className="border-b border-[#ddd1c1] pb-7">
          <Link href="/" className="text-sm font-semibold text-[#6d5c45] hover:text-[#302d28]">RevScale Systems</Link>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a714d]">Legal</p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight md:text-5xl">Condiciones del servicio</h1>
          <p className="mt-4 text-sm leading-6 text-[#6d665d]">Última actualización: {updatedAt}</p>
        </header>

        <div className="mt-8 space-y-8 text-[15px] leading-7 text-[#554f47]">
          <Section title="1. Servicio">
            <p>RevScale Systems ("RevScale") ofrece una plataforma de operación comercial orientada principalmente a organizaciones inmobiliarias. Las funciones pueden incluir gestión de leads, propiedades, conversaciones, tareas, seguimiento comercial, automatizaciones, analítica, integraciones y asistencia basada en inteligencia artificial.</p>
          </Section>

          <Section title="2. Aceptación y cuentas">
            <p>Al crear o utilizar una cuenta de RevScale, la persona usuaria declara tener autorización para actuar en nombre propio o de la organización correspondiente y acepta estas Condiciones. Cada usuario es responsable de mantener seguras sus credenciales y de la actividad realizada desde su cuenta.</p>
          </Section>

          <Section title="3. Uso permitido">
            <p>RevScale debe utilizarse de forma lícita y profesional. No está permitido usar el servicio para fraude, spam, suplantación, acceso no autorizado, distribución de contenido ilícito, interferencia con sistemas de terceros ni tratamiento de datos sin una base legítima.</p>
          </Section>

          <Section title="4. Datos de la organización">
            <p>La organización conserva la responsabilidad sobre los datos que ingresa o conecta a RevScale y sobre contar con las autorizaciones necesarias para tratarlos. RevScale procesa esos datos para prestar las funciones habilitadas, de acuerdo con nuestra <Link href="/privacy" className="font-semibold text-[#6d5c45] underline underline-offset-4">Política de privacidad</Link>.</p>
          </Section>

          <Section title="5. WhatsApp, Meta y otros proveedores">
            <p>Al habilitar integraciones de terceros, la organización también queda sujeta a las condiciones, políticas, límites técnicos y requisitos del proveedor correspondiente. RevScale no controla la disponibilidad de servicios externos, la aprobación de cuentas, los límites de mensajería, los cambios de API ni las decisiones de revisión de dichos proveedores.</p>
          </Section>

          <Section title="6. Inteligencia artificial y automatización">
            <p>Las funciones de IA y automatización son herramientas de asistencia. No sustituyen criterio profesional, revisión humana ni asesoramiento legal, contable, financiero o contractual. La organización es responsable de revisar las decisiones comerciales sensibles y de configurar correctamente sus reglas, horarios y derivaciones a personas.</p>
          </Section>

          <Section title="7. Planes, límites y disponibilidad">
            <p>Las funciones disponibles pueden depender del plan contratado, límites operativos, integraciones habilitadas o requisitos externos. RevScale puede modificar o mejorar el producto, aplicar límites razonables para preservar seguridad y estabilidad, y suspender temporalmente funciones cuando sea necesario por mantenimiento, abuso, riesgo de seguridad o dependencia de terceros.</p>
          </Section>

          <Section title="8. Pagos y cambios de plan">
            <p>Cuando existan funciones pagas, el precio, periodicidad y condiciones aplicables se informan antes de la contratación o cambio de plan. Los impuestos, cargos de terceros y servicios externos pueden regirse por condiciones independientes.</p>
          </Section>

          <Section title="9. Propiedad intelectual">
            <p>RevScale, su software, diseño, documentación, marcas y materiales propios pertenecen a sus titulares y están protegidos por la normativa aplicable. El uso del servicio no transfiere derechos de propiedad intelectual fuera de la licencia limitada necesaria para utilizar la plataforma.</p>
          </Section>

          <Section title="10. Suspensión o terminación">
            <p>Podemos suspender o limitar el acceso cuando exista incumplimiento de estas Condiciones, riesgo de seguridad, abuso, impago, requerimiento legal o necesidad de proteger a usuarios y sistemas. Cuando sea razonablemente posible, procuraremos preservar la información de la organización durante un período adecuado para facilitar una eventual reactivación o salida ordenada.</p>
          </Section>

          <Section title="11. Responsabilidad">
            <p>RevScale se presta como una herramienta tecnológica de apoyo operativo. En la máxima medida permitida por la ley, no garantizamos que toda automatización, integración, coincidencia comercial o sugerencia de IA produzca un resultado comercial específico. La organización debe verificar información crítica antes de tomar decisiones vinculantes.</p>
          </Section>

          <Section title="12. Cambios">
            <p>Podemos actualizar estas Condiciones para reflejar cambios del producto, del modelo comercial o de requisitos legales. La versión vigente se publicará en esta URL con su fecha de actualización.</p>
          </Section>

          <Section title="13. Contacto">
            <p>Para consultas relacionadas con estas Condiciones, podés escribir a <a href="mailto:rominamendez456@gmail.com" className="font-semibold text-[#6d5c45] underline underline-offset-4">rominamendez456@gmail.com</a>.</p>
          </Section>
        </div>

        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-[#ddd1c1] pt-6 text-sm text-[#6d665d]">
          <Link href="/privacy" className="hover:text-[#302d28]">Política de privacidad</Link>
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
