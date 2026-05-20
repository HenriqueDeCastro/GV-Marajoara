import { Injectable } from '@angular/core';
import { Pedido, NovoPedido } from '../models/pedido.model';
import { SupabaseService } from './supabase.service';

const TOKEN_KEY = 'gv_token_dono';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private readonly db;

  constructor(private readonly supabase: SupabaseService) {
    this.db = supabase.client;
  }

  get tokenDono(): string {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  }

  async listar(): Promise<Pedido[]> {
    const { data, error } = await this.db
      .from('pedidos')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return data as Pedido[];
  }

  async criar(novo: NovoPedido): Promise<void> {
    const { error } = await this.db.from('pedidos').insert({
      ...novo,
      token_dono: this.tokenDono,
    });

    if (error) throw error;
  }

  async apagar(id: string, senhaAdmin?: string): Promise<boolean> {
    const { data, error } = await this.db.rpc('apagar_pedido', {
      pedido_id: id,
      senha_admin: senhaAdmin ?? '',
      token_usuario: this.tokenDono,
    });

    if (error) throw error;
    return data as boolean;
  }
}
