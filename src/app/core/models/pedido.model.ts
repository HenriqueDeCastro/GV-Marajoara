export interface Pedido {
  id: string;
  solicitante: string;
  alvo: string;
  descricao: string;
  token_dono: string;
  criado_em: string;
}

export interface NovoPedido {
  solicitante: string;
  alvo: string;
  descricao: string;
}
