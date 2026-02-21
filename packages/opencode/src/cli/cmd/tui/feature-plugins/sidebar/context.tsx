import type { AssistantMessage } from "@opencode-ai/sdk/v2"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createMemo, Show } from "solid-js"

const id = "internal:sidebar-context"

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

function View(props: { api: TuiPluginApi; session_id: string }) {
  const theme = () => props.api.theme.current
  const msg = createMemo(() => props.api.state.session.messages(props.session_id))
  const cost = createMemo(() => msg().reduce((sum, item) => sum + (item.role === "assistant" ? item.cost : 0), 0))

  const state = createMemo(() => {
    const last = msg().findLast((item): item is AssistantMessage => item.role === "assistant" && item.tokens.output > 0)
    if (!last) {
      return {
        tokens: 0,
        percent: null,
        cacheHitPercent: null as string | null,
        cacheRead: 0,
        cacheWrite: 0,
        cacheNew: 0,
        cacheInput: 0,
        cacheOutput: 0,
      }
    }

    const tokens =
      last.tokens.input + last.tokens.output + last.tokens.reasoning + last.tokens.cache.read + last.tokens.cache.write
    const totalInput = last.tokens.input + last.tokens.cache.read + last.tokens.cache.write
    const model = props.api.state.provider.find((item) => item.id === last.providerID)?.models[last.modelID]
    return {
      tokens,
      percent: model?.limit.context ? Math.round((tokens / model.limit.context) * 100) : null,
      cacheHitPercent: totalInput > 0 ? ((last.tokens.cache.read / totalInput) * 100).toFixed(3) : null,
      cacheRead: last.tokens.cache.read,
      cacheWrite: last.tokens.cache.write,
      cacheNew: last.tokens.input,
      cacheInput: totalInput,
      cacheOutput: last.tokens.output,
    }
  })

  return (
    <box>
      <text fg={theme().text}>
        <b>Context</b>
      </text>
      <text fg={theme().textMuted}>{state().tokens.toLocaleString()} tokens</text>
      <text fg={theme().textMuted}>{state().percent ?? 0}% used</text>
      <text fg={theme().textMuted}>{money.format(cost())} spent</text>
      <Show when={process.env["OPENCODE_CACHE_AUDIT"] && state().cacheHitPercent != null}>
        <text fg={theme().text}>
          <b>Cache Audit</b>
        </text>
        <text fg={theme().textMuted}>{state().cacheInput.toLocaleString()} input tokens</text>
        <text fg={theme().textMuted}>  {state().cacheNew.toLocaleString()} new</text>
        <text fg={theme().textMuted}>  {state().cacheRead.toLocaleString()} cache read</text>
        <text fg={theme().textMuted}>  {state().cacheWrite.toLocaleString()} cache write</text>
        <text fg={theme().textMuted}>{state().cacheHitPercent}% hit rate</text>
        <text fg={theme().textMuted}>{state().cacheOutput.toLocaleString()} output tokens</text>
      </Show>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 100,
    slots: {
      sidebar_content(_ctx, props) {
        return <View api={api} session_id={props.session_id} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
