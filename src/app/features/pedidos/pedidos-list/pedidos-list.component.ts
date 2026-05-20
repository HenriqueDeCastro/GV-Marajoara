import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Pedido, NovoPedido } from '../../../core/models/pedido.model';
import { PedidosService } from '../../../core/services/pedidos.service';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-pedidos-list',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './pedidos-list.component.html',
  styleUrl: './pedidos-list.component.scss',
})
export class PedidosListComponent implements OnInit, OnDestroy {
  pedidos = signal<Pedido[]>([]);
  carregando = signal(true);
  erro = signal<string | null>(null);

  mostrarModal = signal(false);
  salvando = signal(false);

  mostrarModalAdmin = signal(false);
  modoAdmin = signal(false);
  private senhaAdminAtiva = '';
  inputSenha = '';

  pedidoSelecionado = signal<{ pedido: Pedido; corIndex: number } | null>(null);

  readonly LIMITES = { solicitante: 50, alvo: 80, descricao: 400 };

  form: NovoPedido = { solicitante: '', alvo: '', descricao: '' };

  private canal: RealtimeChannel | null = null;

  constructor(
    private readonly pedidosService: PedidosService,
    private readonly supabaseService: SupabaseService,
  ) {}

  ngOnInit(): void {
    this.carregar();
    this.inscreverRealtime();
  }

  ngOnDestroy(): void {
    if (this.canal) {
      this.supabaseService.client.removeChannel(this.canal);
    }
  }

  private inscreverRealtime(): void {
    this.canal = this.supabaseService.client
      .channel('pedidos-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pedidos' },
        (payload) => {
          const novo = payload.new as Pedido;
          this.pedidos.update((lista) => {
            if (lista.some((p) => p.id === novo.id)) return lista;
            return [novo, ...lista];
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pedidos' },
        (payload) => {
          const id = (payload.old as Pick<Pedido, 'id'>).id;
          this.pedidos.update((lista) => lista.filter((p) => p.id !== id));
          if (this.pedidoSelecionado()?.pedido.id === id) {
            this.pedidoSelecionado.set(null);
          }
        },
      )
      .subscribe();
  }

  @HostListener('document:keydown.escape')
  fecharComEsc(): void {
    if (this.pedidoSelecionado()) this.pedidoSelecionado.set(null);
    else if (this.mostrarModalAdmin()) this.fecharModalAdmin();
    else if (this.mostrarModal()) this.mostrarModal.set(false);
  }

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      this.pedidos.set(await this.pedidosService.listar());
    } catch {
      this.erro.set('Não foi possível carregar os pedidos.');
    } finally {
      this.carregando.set(false);
    }
  }

  podeApagar(pedido: Pedido): boolean {
    return this.modoAdmin() || pedido.token_dono === this.pedidosService.tokenDono;
  }

  async apagar(id: string): Promise<void> {
    try {
      const senha = this.modoAdmin() ? this.senhaAdminAtiva : undefined;
      const ok = await this.pedidosService.apagar(id, senha);
      if (!ok) {
        this.erro.set('Senha de admin incorreta. Modo admin desativado.');
        this.desativarAdmin();
        return;
      }
      this.pedidos.update((lista) => lista.filter((p) => p.id !== id));
      if (this.pedidoSelecionado()?.pedido.id === id) this.pedidoSelecionado.set(null);
    } catch {
      this.erro.set('Não foi possível apagar o pedido.');
    }
  }

  // ── Modal novo pedido ──────────────────────────────────────────────────────
  abrirModal(): void {
    this.form = { solicitante: '', alvo: '', descricao: '' };
    this.mostrarModal.set(true);
  }

  fecharModal(): void {
    this.mostrarModal.set(false);
  }

  async salvar(): Promise<void> {
    if (!this.form.solicitante.trim() || !this.form.alvo.trim() || !this.form.descricao.trim()) return;
    this.salvando.set(true);
    try {
      await this.pedidosService.criar(this.form);
      this.fecharModal();
    } catch {
      this.erro.set('Não foi possível salvar o pedido.');
    } finally {
      this.salvando.set(false);
    }
  }

  // ── Modal admin ────────────────────────────────────────────────────────────
  abrirModalAdmin(): void {
    this.inputSenha = '';
    this.mostrarModalAdmin.set(true);
  }

  fecharModalAdmin(): void {
    this.inputSenha = '';
    this.mostrarModalAdmin.set(false);
  }

  ativarAdmin(): void {
    if (!this.inputSenha.trim()) return;
    this.senhaAdminAtiva = this.inputSenha.trim();
    this.modoAdmin.set(true);
    this.fecharModalAdmin();
  }

  desativarAdmin(): void {
    this.senhaAdminAtiva = '';
    this.modoAdmin.set(false);
  }

  // ── Post-it expandido ──────────────────────────────────────────────────────
  abrirPedido(pedido: Pedido, index: number): void {
    this.pedidoSelecionado.set({ pedido, corIndex: (index % 4) + 1 });
  }

  fecharPedido(): void {
    this.pedidoSelecionado.set(null);
  }
}
