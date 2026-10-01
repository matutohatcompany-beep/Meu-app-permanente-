export function onlyDigits(s: string): string {
  return (s || "").replace(/\D/g, "");
}

// Fill a WhatsApp template with client/sale data: {nome} {produto} {cidade} {data}
export function fillTemplate(
  body: string,
  vars: { nome?: string; produto?: string; cidade?: string; data?: string },
): string {
  return body
    .replace(/\{nome\}/gi, vars.nome ?? "")
    .replace(/\{produto\}/gi, vars.produto ?? "")
    .replace(/\{cidade\}/gi, vars.cidade ?? "")
    .replace(/\{data\}/gi, vars.data ?? "");
}
