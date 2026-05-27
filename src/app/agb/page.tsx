import { Radar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AGB — LLM Radar',
  description: 'Allgemeine Geschäftsbedingungen für LLM Radar',
}

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Radar className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">LLM Radar</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="prose prose-gray prose-lg max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700">
          <h1>Allgemeine Geschäftsbedingungen (AGB) für LLM Radar</h1>

          <p className="text-gray-500 text-base">
            <strong>TBN Public Relations GmbH</strong><br />
            Fuchsstr. 58, 90768 Fürth, Deutschland<br />
            Geschäftsführer: Jens Fuderholz<br />
            E-Mail: info@tbnpr.de<br />
            Website: <a href="https://llmradar.de">https://llmradar.de</a>
          </p>

          <p className="text-gray-400 text-sm">Stand: 27. Mai 2026</p>

          <hr />

          <h2>§ 1 Geltungsbereich und Vertragsgegenstand</h2>

          <p>(1) Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB") der TBN Public Relations GmbH, Fuchsstr. 58, 90768 Fürth (nachfolgend „Anbieter"), gelten für sämtliche Verträge über die Nutzung der Software-as-a-Service-Plattform „LLM Radar" (nachfolgend „Dienst"), die zwischen dem Anbieter und dem Kunden (nachfolgend „Kunde") geschlossen werden.</p>

          <p>(2) Der Dienst richtet sich ausschließlich an Unternehmer im Sinne des § 14 BGB, d.&nbsp;h. an natürliche oder juristische Personen oder rechtsfähige Personengesellschaften, die bei Abschluss des Vertrags in Ausübung ihrer gewerblichen oder selbständigen beruflichen Tätigkeit handeln. Mit der Registrierung bestätigt der Kunde, dass er den Dienst ausschließlich zu gewerblichen oder selbständigen beruflichen Zwecken nutzt. Der Abschluss von Verträgen mit Verbrauchern im Sinne des § 13 BGB ist ausgeschlossen.</p>

          <p>(3) Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen des Kunden werden nicht Vertragsbestandteil, es sei denn, der Anbieter stimmt ihrer Geltung ausdrücklich in Textform zu.</p>

          <p>(4) Maßgeblich ist die jeweils zum Zeitpunkt des Vertragsschlusses gültige Fassung dieser AGB.</p>

          <h2>§ 2 Leistungsbeschreibung</h2>

          <p>(1) LLM Radar ist eine webbasierte SaaS-Plattform zur Analyse, Überwachung und Optimierung der Sichtbarkeit von Unternehmen und Marken in KI-gestützten Suchsystemen und großen Sprachmodellen (Large Language Models, z.&nbsp;B. ChatGPT, Google Gemini, Anthropic Claude, Perplexity). Der Dienst umfasst insbesondere:</p>

          <ul>
            <li><strong>GEO-Diagnose:</strong> Analyse der Sichtbarkeit und Darstellung eines Unternehmens in verschiedenen KI-Suchsystemen.</li>
            <li><strong>Knowledge Builder:</strong> Werkzeuge zur Erstellung und Optimierung von Inhalten, die die KI-Sichtbarkeit verbessern.</li>
            <li><strong>MCP-Server:</strong> Technische Infrastruktur zur strukturierten Bereitstellung verifizierter Unternehmensinformationen in maschinenlesbarer Form. Der Anbieter schuldet nicht, dass bestimmte Drittanbieter-KI-Systeme diese Informationen abrufen, verarbeiten, übernehmen oder in Antworten berücksichtigen.</li>
            <li><strong>Monitoring:</strong> Fortlaufende Überwachung der KI-Sichtbarkeit mit Benachrichtigungen bei Veränderungen.</li>
            <li><strong>Export:</strong> Exportfunktionen für Berichte und Analysedaten.</li>
          </ul>

          <p>(2) Der konkrete Funktionsumfang richtet sich nach dem vom Kunden gewählten Abonnement-Plan (nachfolgend „Plan"). Die jeweils aktuellen Pläne und deren Leistungsumfang sind auf der Website <a href="https://llmradar.de">https://llmradar.de</a> einsehbar.</p>

          <p>(3) Der Anbieter ist berechtigt, den Dienst angemessen weiterzuentwickeln, zu verbessern und technisch anzupassen, soweit dies dem Kunden zumutbar ist und die wesentlichen Kernfunktionen des gewählten Plans erhalten bleiben. Über wesentliche Änderungen wird der Anbieter den Kunden rechtzeitig informieren.</p>

          <p>(4) Der Dienst nutzt Schnittstellen zu Drittanbieterdiensten (insbesondere KI-Systeme wie OpenAI, Google, Anthropic und Perplexity). Die Verfügbarkeit und Funktionsweise dieser externen Dienste liegt außerhalb des Einflussbereichs des Anbieters. Änderungen, Einschränkungen oder der Wegfall von Drittanbieterdiensten können den Funktionsumfang des Dienstes beeinflussen, ohne dass der Anbieter hierfür haftet, sofern er den Kunden unverzüglich informiert und sich um angemessene Alternativen bemüht.</p>

          <p>(5) Der Anbieter stellt den Dienst nach Maßgabe der vereinbarten Leistungsbeschreibung bereit. Eine bestimmte jederzeitige Verfügbarkeit wird nur geschuldet, soweit sie ausdrücklich vereinbart ist. Vorübergehende Einschränkungen können sich insbesondere aus Wartungsarbeiten, Sicherheitsmaßnahmen, technischen Störungen, höherer Gewalt, Störungen bei Drittanbietern oder kundenseitigen Umständen ergeben. Geplante Wartungsarbeiten werden nach Möglichkeit vorab angekündigt. Der Anbieter strebt eine marktübliche Verfügbarkeit an, ohne eine bestimmte Mindestverfügbarkeit zu garantieren, sofern nicht im jeweiligen Plan ausdrücklich etwas anderes vereinbart ist.</p>

          <p>(6) Der Kunde nimmt zur Kenntnis, dass KI-generierte Inhalte und Analyseergebnisse fehlerhaft, unvollständig, veraltet oder missverständlich sein können. Der Dienst ersetzt keine rechtliche, technische, steuerliche oder sonstige fachliche Beratung. Der Kunde ist verpflichtet, Ergebnisse vor einer geschäftskritischen Verwendung eigenverantwortlich zu prüfen.</p>

          <p>(7) Support wird per E-Mail oder über die im Dienst vorgesehenen Supportkanäle erbracht. Reaktionszeiten werden nur geschuldet, soweit sie im jeweiligen Plan ausdrücklich vereinbart sind.</p>

          <h2>§ 3 Vertragsschluss und Registrierung</h2>

          <p>(1) Die Darstellung des Dienstes und der Pläne auf der Website stellt kein rechtlich bindendes Angebot dar, sondern eine Aufforderung zur Abgabe eines Angebots (invitatio ad offerendum).</p>

          <p>(2) Der Kunde gibt durch Abschluss des Registrierungsprozesses und Auswahl eines Plans ein verbindliches Angebot auf Abschluss eines Nutzungsvertrags ab. Voraussetzung ist die vollständige und wahrheitsgemäße Angabe der bei der Registrierung geforderten Daten (insbesondere Firmenname, Ansprechpartner, geschäftliche E-Mail-Adresse, Unternehmensanschrift und Umsatzsteuer-Identifikationsnummer, sofern vorhanden).</p>

          <p>(3) Der Vertrag kommt zustande, wenn der Anbieter das Angebot des Kunden durch Bereitstellung des Zugangs zum Dienst oder durch eine Bestätigungs-E-Mail annimmt.</p>

          <p>(4) Der Vertragstext wird vom Anbieter nach Vertragsschluss gespeichert und ist dem Kunden auf Anfrage zugänglich. Der Kunde kann die AGB jederzeit auf der Website einsehen und abspeichern.</p>

          <p>(5) Vertragssprache ist Deutsch.</p>

          <p>(6) Der Kunde ist verpflichtet, seine Registrierungsdaten aktuell zu halten und den Anbieter unverzüglich über Änderungen zu informieren.</p>

          <h2>§ 4 Nutzerkonto und Zugangsdaten</h2>

          <p>(1) Jeder Kunde erhält nach erfolgreicher Registrierung ein persönliches Nutzerkonto (nachfolgend „Konto"). Das Konto ist nicht übertragbar.</p>

          <p>(2) Der Kunde ist für die Geheimhaltung seiner Zugangsdaten (E-Mail-Adresse und Passwort) allein verantwortlich. Er hat sicherzustellen, dass Unbefugte keinen Zugang zu seinem Konto erhalten. Der Anbieter haftet nicht für Schäden, die durch die unbefugte Nutzung der Zugangsdaten des Kunden entstehen, sofern der Anbieter dies nicht zu vertreten hat.</p>

          <p>(3) Der Kunde ist verpflichtet, den Anbieter unverzüglich zu informieren, wenn er Kenntnis von einer unbefugten Nutzung seines Kontos erlangt oder den Verdacht einer solchen Nutzung hat.</p>

          <p>(4) Die gleichzeitige Nutzung eines Kontos durch mehrere Personen ist nur zulässig, wenn der gewählte Plan dies ausdrücklich vorsieht.</p>

          <h2>§ 5 Nutzungsrechte</h2>

          <p>(1) Der Anbieter räumt dem Kunden für die Dauer des Vertragsverhältnisses ein einfaches (nicht ausschließliches), nicht übertragbares, nicht unterlizenzierbares Recht ein, den Dienst im Rahmen dieser AGB und des gewählten Plans zu nutzen.</p>

          <p>(2) Das Nutzungsrecht ist auf die eigene geschäftliche Nutzung des Kunden beschränkt. Eine Nutzung des Dienstes zugunsten Dritter oder eine Weiterveräußerung des Zugangs ist ohne vorherige Zustimmung des Anbieters in Textform unzulässig.</p>

          <p>(3) Der Kunde darf den Dienst nicht:</p>
          <ul>
            <li>dekompilieren, disassemblieren, zurückentwickeln (Reverse Engineering) oder auf andere Weise versuchen, den Quellcode oder die zugrunde liegende Struktur des Dienstes zu ermitteln;</li>
            <li>kopieren, vervielfältigen, verbreiten, öffentlich zugänglich machen oder Dritten zugänglich machen;</li>
            <li>verändern, anpassen oder abgeleitete Werke erstellen;</li>
            <li>für rechtswidrige, betrügerische oder missbräuchliche Zwecke nutzen;</li>
            <li>in einer Weise nutzen, die die Infrastruktur, Sicherheit oder den Betrieb des Dienstes gefährdet oder übermäßig belastet.</li>
          </ul>

          <p>(4) Der Anbieter ist berechtigt, den Zugang des Kunden bei einem wesentlichen Verstoß gegen diese Nutzungsbedingungen nach vorheriger Abmahnung vorübergehend zu sperren. In schwerwiegenden Fällen, insbesondere bei rechtswidrigem Verhalten, kann die Sperrung auch ohne vorherige Abmahnung erfolgen.</p>

          <p>(5) Der Anbieter kann für Pläne angemessene Nutzungsgrenzen festlegen, insbesondere hinsichtlich Anzahl der Projekte, Domains, Nutzer, Reports, Abfragen, API-Aufrufe, Crawling-Vorgänge, gespeicherter Daten und Monitoring-Intervalle. Soweit ein Plan als „unbegrenzt" bezeichnet wird, gilt dies nur im Rahmen einer angemessenen und üblichen Nutzung (Fair Use). Eine missbräuchliche, automatisierte oder außergewöhnlich ressourcenintensive Nutzung ist unzulässig.</p>

          <h2>§ 6 Pflichten des Kunden</h2>

          <p>(1) Der Kunde verpflichtet sich, den Dienst nur im Einklang mit den geltenden Gesetzen und Vorschriften zu nutzen.</p>

          <p>(2) Der Kunde gewährleistet, dass die von ihm in den Dienst eingegebenen Daten und Inhalte (nachfolgend „Kundendaten") keine Rechte Dritter (insbesondere Urheber-, Marken-, Persönlichkeitsrechte) verletzen und nicht gegen geltendes Recht verstoßen.</p>

          <p>(3) Der Kunde ist für die regelmäßige Sicherung seiner Kundendaten selbst verantwortlich. Der Anbieter erstellt zwar regelmäßige Backups der Systeme, übernimmt jedoch keine Garantie für die Wiederherstellung individueller Kundendaten.</p>

          <p>(4) Der Kunde verpflichtet sich, keine Inhalte einzustellen oder zu übermitteln, die rechtswidrig, beleidigend, bedrohend, diskriminierend, gewaltverherrlichend, pornografisch oder in sonstiger Weise anstößig sind.</p>

          <p>(5) Beauftragt der Kunde den Anbieter mit der Analyse, dem Crawling oder der Verarbeitung von Websites, Domains oder Online-Inhalten, versichert der Kunde, hierzu berechtigt zu sein. Der Kunde stellt sicher, dass durch die Nutzung des Dienstes keine Rechte Dritter, Nutzungsbedingungen Dritter oder gesetzlichen Vorgaben verletzt werden.</p>

          <p>(6) Der Kunde stellt den Anbieter von sämtlichen Ansprüchen Dritter frei, die aufgrund einer schuldhaften Verletzung dieser Pflichten durch den Kunden gegen den Anbieter geltend gemacht werden. Der Kunde übernimmt die Kosten der Rechtsverteidigung des Anbieters einschließlich sämtlicher Gerichts- und Anwaltskosten in gesetzlicher Höhe.</p>

          <h2>§ 7 Abonnement-Pläne und Preise</h2>

          <p>(1) Der Dienst wird in verschiedenen Abonnement-Plänen angeboten. Die jeweils aktuellen Pläne, deren Funktionsumfang und Preise sind auf der Website <a href="https://llmradar.de">https://llmradar.de</a> einsehbar. Zum Zeitpunkt der Veröffentlichung dieser AGB sind folgende Pläne verfügbar:</p>

          <ul>
            <li><strong>Starter:</strong> € 99,00 netto pro Monat (zzgl. gesetzlicher USt.)</li>
            <li><strong>Pro:</strong> € 499,00 netto pro Monat (zzgl. gesetzlicher USt.)</li>
            <li><strong>Managed:</strong> € 799,00 netto pro Monat (zzgl. gesetzlicher USt.)</li>
          </ul>

          <p>(2) Alle angegebenen Preise verstehen sich als Nettopreise zuzüglich der jeweils gültigen gesetzlichen Umsatzsteuer (derzeit 19&nbsp;%).</p>

          <p>(3) Der Anbieter ist berechtigt, die Preise für laufende Abonnements mit Wirkung zum Beginn eines neuen Abrechnungszeitraums anzupassen, wenn sich die für die Preisbildung maßgeblichen Kosten ändern, insbesondere Kosten für Hosting, Drittanbieter-APIs, KI-Schnittstellen, Zahlungsdienstleister, Personal, Betrieb, Sicherheit oder gesetzliche Anforderungen. Die Anpassung muss angemessen sein und darf die Kostenentwicklung nicht übersteigen. Der Anbieter informiert den Kunden mindestens sechs (6) Wochen vor Wirksamwerden in Textform. Der Kunde kann den Vertrag bis zum Wirksamwerden der Preisänderung kündigen. Hierauf wird der Anbieter in der Mitteilung gesondert hinweisen.</p>

          <p>(4) Sonderleistungen, die über den gewählten Plan hinausgehen, werden gesondert vereinbart und vergütet.</p>

          <h2>§ 8 Zahlung und Abrechnung</h2>

          <p>(1) Die Abonnementgebühren werden jeweils im Voraus für den vereinbarten Abrechnungszeitraum (monatlich) fällig und über den Zahlungsdienstleister Stripe (Stripe Payments Europe, Ltd.) abgewickelt.</p>

          <p>(2) Der Kunde autorisiert den Anbieter, die Abonnementgebühren zum Beginn eines jeden Abrechnungszeitraums automatisch über die hinterlegte Zahlungsmethode (Kreditkarte oder SEPA-Lastschrift) einzuziehen.</p>

          <p>(3) Der Kunde ist verpflichtet, stets eine gültige Zahlungsmethode im Konto zu hinterlegen und deren Aktualität sicherzustellen. Schlägt eine Zahlung fehl, wird der Kunde darüber informiert und aufgefordert, die Zahlungsinformationen zu aktualisieren.</p>

          <p>(4) Kommt der Kunde mit der Zahlung in Verzug, gelten die gesetzlichen Regelungen. Der Verzugszinssatz beträgt neun (9) Prozentpunkte über dem Basiszinssatz (§ 288 Abs. 2 BGB). Der Anbieter behält sich die Geltendmachung eines weitergehenden Verzugsschadens vor.</p>

          <p>(5) Der Anbieter ist berechtigt, den Zugang zum Dienst nach Ablauf einer Nachfrist von vierzehn (14) Tagen nach Fälligkeitseintritt und erfolgloser Mahnung zu sperren, bis die ausstehenden Beträge vollständig beglichen sind.</p>

          <p>(6) Die Aufrechnung durch den Kunden ist nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen zulässig. Ein Zurückbehaltungsrecht des Kunden besteht nur, soweit sein Gegenanspruch auf demselben Vertragsverhältnis beruht.</p>

          <h2>§ 9 Vertragslaufzeit und Kündigung</h2>

          <p>(1) Der Vertrag wird auf unbestimmte Zeit geschlossen und kann von beiden Seiten ordentlich gekündigt werden.</p>

          <p>(2) Bei monatlicher Abrechnung kann der Vertrag von jeder Partei mit einer Frist von vierzehn (14) Tagen zum Ende des jeweiligen Abrechnungszeitraums gekündigt werden.</p>

          <p>(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt insbesondere vor, wenn:</p>
          <ul>
            <li>der Kunde trotz Mahnung und Nachfristsetzung mit der Zahlung von mindestens zwei (2) Monatsgebühren in Verzug ist;</li>
            <li>der Kunde wesentlich gegen diese AGB verstößt und den Verstoß trotz Abmahnung nicht innerhalb einer angemessenen Frist behebt;</li>
            <li>über das Vermögen des Kunden ein Insolvenzverfahren beantragt oder eröffnet wird.</li>
          </ul>

          <p>(4) Die Kündigung bedarf der Textform (z.&nbsp;B. E-Mail). Der Kunde kann die Kündigung auch über die Self-Service-Funktion im Konto (Stripe Billing Portal) erklären.</p>

          <p>(5) Nach Wirksamwerden der Kündigung wird das Konto deaktiviert. Der Kunde ist verpflichtet, seine Daten vor Ablauf der Vertragslaufzeit zu exportieren. Der Anbieter wird die Kundendaten innerhalb von dreißig (30) Tagen nach Vertragsende löschen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>

          <p>(6) Bereits gezahlte Abonnementgebühren für den laufenden Abrechnungszeitraum werden bei ordentlicher Kündigung nicht erstattet. Bei außerordentlicher Kündigung durch den Kunden aufgrund eines vom Anbieter zu vertretenden wichtigen Grundes werden anteilige Beträge erstattet.</p>

          <h2>§ 10 Kostenlose Leistungen, Testphasen und Beta-Funktionen</h2>

          <p>(1) Der Anbieter kann kostenlose Leistungen (z.&nbsp;B. eine einmalige GEO-Analyse) oder Testphasen anbieten. Diese unterliegen ebenfalls den vorliegenden AGB, soweit nicht ausdrücklich abweichende Bedingungen gelten.</p>

          <p>(2) Der Anbieter behält sich vor, kostenlose Leistungen oder Testphasen jederzeit einzuschränken, zu ändern oder einzustellen. Aus kostenlosen Leistungen entsteht kein Anspruch auf fortgesetzte Bereitstellung.</p>

          <p>(3) Sofern nicht anders angegeben, geht eine Testphase nicht automatisch in ein kostenpflichtiges Abonnement über.</p>

          <p>(4) Der Anbieter kann einzelne Funktionen als Beta-, Test- oder Preview-Funktionen bereitstellen. Diese Funktionen können unvollständig, fehlerhaft oder instabil sein und jederzeit geändert oder eingestellt werden. Verfügbarkeits- oder Beschaffenheitszusagen bestehen insoweit nur, soweit sie ausdrücklich vereinbart wurden.</p>

          <h2>§ 11 Managed-Plan — Besondere Bestimmungen</h2>

          <p>(1) Der Managed-Plan umfasst neben den technischen Funktionen des Pro-Plans zusätzlich Beratungs- und Serviceleistungen durch den Anbieter (insbesondere Pflege des Knowledge Builders, inhaltliche Beratung zur KI-Sichtbarkeit). Der konkrete Leistungsumfang wird individuell vereinbart.</p>

          <p>(2) Die Beratungs- und Serviceleistungen werden als Dienstleistung (Dienstvertrag gemäß §§ 611 ff. BGB) erbracht. Der Anbieter schuldet ein sorgfältiges Tätigwerden, nicht jedoch einen bestimmten Erfolg (insbesondere keine Garantie für eine verbesserte KI-Sichtbarkeit oder bestimmte Rankings).</p>

          <p>(3) Der Kunde stellt dem Anbieter die für die Erbringung der Serviceleistungen erforderlichen Informationen und Materialien rechtzeitig zur Verfügung und wirkt im zumutbaren Umfang mit.</p>

          <h2>§ 12 Gewährleistung und Mängelrechte</h2>

          <p>(1) Der Anbieter gewährleistet, dass der Dienst während der Vertragslaufzeit im Wesentlichen den in der Leistungsbeschreibung und auf der Website dargestellten Funktionen entspricht.</p>

          <p>(2) Mängel am Dienst wird der Anbieter nach entsprechender Mitteilung durch den Kunden innerhalb angemessener Frist beheben. Der Kunde hat Mängel möglichst detailliert zu beschreiben und dem Anbieter alle für die Fehleranalyse erforderlichen Informationen zu übermitteln.</p>

          <p>(3) Es wird klargestellt, dass der Dienst ein Analyse- und Optimierungswerkzeug ist. Der Anbieter übernimmt keine Gewährleistung oder Garantie für:</p>
          <ul>
            <li>die Richtigkeit, Vollständigkeit oder Aktualität der von Drittanbieter-KI-Systemen generierten Antworten und Analyseergebnisse;</li>
            <li>eine Verbesserung der KI-Sichtbarkeit des Kunden oder bestimmte Platzierungen in KI-generierten Antworten;</li>
            <li>die ununterbrochene oder fehlerfreie Verfügbarkeit des Dienstes;</li>
            <li>die Kompatibilität mit bestimmten Endgeräten, Browsern oder Betriebssystemen.</li>
          </ul>

          <p>(4) Für Mängelansprüche des Kunden gilt eine Verjährungsfrist von zwölf (12) Monaten, soweit gesetzlich zulässig. Die Frist beginnt nach den gesetzlichen Vorschriften. Schadensersatzansprüche nach § 13 Abs. 1 bleiben unberührt.</p>

          <h2>§ 13 Haftung</h2>

          <p>(1) Der Anbieter haftet unbeschränkt:</p>
          <ul>
            <li>bei Vorsatz und grober Fahrlässigkeit;</li>
            <li>für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit;</li>
            <li>nach den Vorschriften des Produkthaftungsgesetzes;</li>
            <li>im Umfang einer vom Anbieter übernommenen Garantie.</li>
          </ul>

          <p>(2) Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) ist die Haftung des Anbieters der Höhe nach begrenzt auf den bei Vertragsschluss vorhersehbaren, vertragstypischen Schaden. Wesentliche Vertragspflichten sind solche, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf.</p>

          <p>(3) Die Höhe der Haftung gemäß Absatz (2) ist begrenzt auf die Summe der vom Kunden in den zwölf (12) Monaten vor dem haftungsbegründenden Ereignis gezahlten Nettoentgelte, mindestens jedoch € 5.000,00 und höchstens € 25.000,00.</p>

          <p>(4) Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.</p>

          <p>(5) Die vorstehenden Haftungsbeschränkungen und -ausschlüsse gelten gleichermaßen zugunsten der Organe, gesetzlichen Vertreter, Angestellten und sonstigen Erfüllungsgehilfen des Anbieters.</p>

          <p>(6) Der Anbieter haftet nicht für Störungen, Einschränkungen, Änderungen oder die Nichtverfügbarkeit von Drittanbieterdiensten (insbesondere KI-Systeme), soweit diese außerhalb seines Einflussbereichs liegen und der Anbieter kein Auswahl-, Integrations- oder Überwachungsverschulden zu vertreten hat.</p>

          <p>(7) Der Anbieter haftet nicht für den Verlust von Kundendaten, soweit der Schaden durch eine zumutbare Datensicherung seitens des Kunden hätte vermieden werden können.</p>

          <p>(8) Schadensersatzansprüche des Kunden verjähren innerhalb von zwölf (12) Monaten ab Kenntnis des Schadens, spätestens jedoch innerhalb von drei (3) Jahren ab dem schädigenden Ereignis. Dies gilt nicht für Ansprüche nach Absatz (1).</p>

          <h2>§ 14 Datenschutz</h2>

          <p>(1) Der Anbieter verarbeitet personenbezogene Daten des Kunden und seiner Mitarbeiter ausschließlich in Übereinstimmung mit den geltenden datenschutzrechtlichen Bestimmungen, insbesondere der Datenschutz-Grundverordnung (DSGVO) und dem Bundesdatenschutzgesetz (BDSG).</p>

          <p>(2) Details zur Datenverarbeitung, den Rechtsgrundlagen, den Rechten der Betroffenen und den eingesetzten Auftragsverarbeitern sind in der <a href="/datenschutz">Datenschutzerklärung für LLM Radar</a> geregelt.</p>

          <p>(3) Soweit der Anbieter im Rahmen der Leistungserbringung personenbezogene Daten im Auftrag des Kunden verarbeitet, schließen die Parteien eine gesonderte Vereinbarung zur Auftragsverarbeitung gemäß Art. 28 DSGVO ab.</p>

          <p>(4) Die Zahlungsabwicklung erfolgt durch Stripe Payments Europe, Ltd. Der Kunde nimmt zur Kenntnis, dass hierfür zahlungsrelevante Daten an Stripe übermittelt werden. Es gelten die <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">Datenschutzbestimmungen von Stripe</a>.</p>

          <h2>§ 15 Vertraulichkeit</h2>

          <p>(1) Beide Parteien verpflichten sich, alle im Rahmen des Vertragsverhältnisses erhaltenen vertraulichen Informationen der jeweils anderen Partei vertraulich zu behandeln und nicht an Dritte weiterzugeben, es sei denn, dies ist zur Vertragserfüllung erforderlich oder die offenlegende Partei hat zuvor in Textform zugestimmt.</p>

          <p>(2) Als vertraulich gelten alle nicht öffentlich zugänglichen geschäftlichen, technischen und betrieblichen Informationen, die als vertraulich gekennzeichnet sind oder deren Vertraulichkeit sich aus den Umständen ergibt.</p>

          <p>(3) Die Vertraulichkeitsverpflichtung gilt nicht für Informationen, die (a) zum Zeitpunkt der Offenlegung bereits öffentlich bekannt waren, (b) ohne Verschulden der empfangenden Partei öffentlich bekannt werden, (c) der empfangenden Partei bereits zuvor rechtmäßig bekannt waren oder (d) aufgrund gesetzlicher Verpflichtung offengelegt werden müssen.</p>

          <p>(4) Die Vertraulichkeitsverpflichtung besteht über die Beendigung des Vertrags hinaus für einen Zeitraum von fünf (5) Jahren fort. Für Geschäftsgeheimnisse im Sinne des Geschäftsgeheimnisgesetzes (GeschGehG) gilt sie zeitlich unbegrenzt, solange die betreffende Information Geschäftsgeheimnis ist.</p>

          <h2>§ 16 Geistiges Eigentum</h2>

          <p>(1) Sämtliche Rechte an dem Dienst, einschließlich der Software, Algorithmen, Dokumentationen, Marken, Logos und Dienstleistungszeichen, verbleiben beim Anbieter. Dem Kunden wird lediglich das in § 5 beschriebene Nutzungsrecht eingeräumt.</p>

          <p>(2) Der Kunde behält sämtliche Rechte an seinen Kundendaten. Er räumt dem Anbieter für die Dauer des Vertrags das einfache, räumlich unbeschränkte Recht ein, Kundendaten zu speichern, zu vervielfältigen, technisch zu verarbeiten, zu analysieren, umzuwandeln, zu strukturieren, zu indexieren, darzustellen, über Schnittstellen bereitzustellen und an technische Dienstleister sowie angebundene Drittanbieter-Schnittstellen zu übermitteln, soweit dies zur Erbringung des Dienstes — insbesondere zur Analyse, zum Monitoring, zum Knowledge Builder und zur Bereitstellung maschinenlesbarer Informationsschichten — erforderlich ist.</p>

          <p>(3) Der Anbieter ist berechtigt, anonymisierte und aggregierte Nutzungsdaten (z.&nbsp;B. allgemeine Nutzungsstatistiken, Branchenbenchmarks) während und nach der Vertragslaufzeit für die Weiterentwicklung, Analyse und Verbesserung des Dienstes zu verwenden, sofern ein Rückschluss auf den einzelnen Kunden ausgeschlossen ist.</p>

          <p>(4) Feedback und Verbesserungsvorschläge des Kunden kann der Anbieter unentgeltlich für die Weiterentwicklung des Dienstes nutzen, ohne dass hieraus Vergütungs- oder Beteiligungsansprüche des Kunden entstehen.</p>

          <h2>§ 17 Referenznennung</h2>

          <p>(1) Der Anbieter darf den Kunden in sachlicher Form als Kunden nennen, sofern der Kunde dem nicht in Textform widerspricht.</p>

          <p>(2) Die Verwendung von Logos, Marken oder sonstigen Kennzeichen des Kunden zu Referenzzwecken erfolgt nur mit vorheriger Zustimmung des Kunden.</p>

          <h2>§ 18 Höhere Gewalt</h2>

          <p>(1) Keine Partei haftet für die Nichterfüllung oder verspätete Erfüllung ihrer vertraglichen Pflichten, soweit die Nichterfüllung oder Verzögerung auf Umständen beruht, die außerhalb ihres zumutbaren Einflussbereichs liegen (höhere Gewalt). Dies umfasst insbesondere: Naturkatastrophen, Epidemien oder Pandemien, Krieg, Terrorismus, Aufstände, behördliche Anordnungen, Streiks und Aussperrungen, Ausfälle von Telekommunikations- oder Internetleitungen, Cyberangriffe (DDoS-Attacken), sowie Ausfälle von Drittanbieterdiensten oder Cloud-Infrastrukturen.</p>

          <p>(2) Die betroffene Partei hat die andere Partei unverzüglich über das Eintreten und die voraussichtliche Dauer des Hindernisses zu informieren und alle zumutbaren Maßnahmen zur Minderung der Auswirkungen zu ergreifen.</p>

          <h2>§ 19 Änderungen der AGB</h2>

          <p>(1) Der Anbieter kann diese AGB mit Wirkung für die Zukunft ändern, soweit die Änderung aufgrund gesetzlicher Änderungen, höchstrichterlicher Rechtsprechung, technischer Entwicklungen, Sicherheitsanforderungen oder Änderungen des Dienstes erforderlich ist und das vertragliche Äquivalenzverhältnis nicht wesentlich verändert. Änderungen von Hauptleistungspflichten, Preisen, Laufzeiten und Kündigungsrechten erfolgen nicht auf Grundlage dieser Klausel.</p>

          <p>(2) Der Anbieter informiert den Kunden mindestens sechs (6) Wochen vor Inkrafttreten in Textform über die Änderungen. Widerspricht der Kunde nicht bis zum Inkrafttreten, gelten die Änderungen als angenommen, sofern der Anbieter den Kunden in der Änderungsmitteilung ausdrücklich auf die Widerspruchsmöglichkeit, die Frist und die Rechtsfolgen seines Schweigens hingewiesen hat.</p>

          <p>(3) Im Falle eines Widerspruchs kann jede Partei den Vertrag zum Ende des laufenden Abrechnungszeitraums kündigen.</p>

          <h2>§ 20 Schlussbestimmungen</h2>

          <p>(1) <strong>Anwendbares Recht:</strong> Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).</p>

          <p>(2) <strong>Gerichtsstand:</strong> Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist Fürth (Bayern). Der Anbieter ist berechtigt, den Kunden auch an seinem allgemeinen Gerichtsstand zu verklagen.</p>

          <p>(3) <strong>Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen oder undurchführbaren Bestimmung treten die gesetzlichen Vorschriften.</p>

          <p>(4) <strong>Abtretung:</strong> Der Kunde darf Rechte und Pflichten aus diesem Vertrag nicht ohne vorherige Zustimmung des Anbieters in Textform an Dritte abtreten. Der Anbieter ist berechtigt, seine Rechte und Pflichten aus diesem Vertrag auf mit ihm verbundene Unternehmen oder Nachfolger zu übertragen, sofern dadurch die Rechte des Kunden nicht wesentlich beeinträchtigt werden.</p>

          <p>(5) <strong>Textformklausel:</strong> Nebenabreden, Änderungen und Ergänzungen dieses Vertrages bedürfen zu ihrer Wirksamkeit der Textform. Dies gilt auch für die Abbedingung dieser Textformklausel.</p>

          <p>(6) <strong>Vollständigkeit:</strong> Diese AGB, zusammen mit der Leistungsbeschreibung auf der Website und ggf. individuellen Vereinbarungen, stellen die vollständige Vereinbarung zwischen den Parteien hinsichtlich des Vertragsgegenstands dar und ersetzen alle früheren Vereinbarungen und Absprachen.</p>
        </article>
      </main>

      {/* Footer */}
      <footer className="py-8 bg-gray-50 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Radar className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">LLM Radar</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="https://tbnpr.de/impressum" className="hover:text-gray-700 transition-colors" target="_blank" rel="noopener">Impressum</a>
              <a href="/datenschutz" className="hover:text-gray-700 transition-colors" target="_blank" rel="noopener">Datenschutz</a>
              <a href="/agb" className="hover:text-gray-700 transition-colors font-medium text-gray-700">AGB</a>
            </div>
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} TBN Public Relations GmbH. Alle Rechte vorbehalten.
          </p>
        </div>
      </footer>
    </div>
  )
}
