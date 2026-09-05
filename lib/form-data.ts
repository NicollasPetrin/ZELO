/**
 * Leitura de campo de formulario.
 *
 * `formData.get()` devolve `null` para campo que o formulario nao renderizou, e
 * `null` nao e o mesmo que ausente para o Zod: `.optional()` aceita
 * `string | undefined` e recusa `null`. Passar o retorno cru para o schema faz
 * todo campo opcional que ficou fora do formulario derrubar a validacao inteira
 * — com a mensagem generica de "revise os dados", que nao diz qual campo foi.
 *
 * Traduzir aqui, na fronteira, mantem o schema descrevendo a regra de negocio
 * em vez de acomodar um detalhe da API do navegador.
 */
export function readText(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : undefined;
}
