export type VideoPluginType = 'VirtualBackground' | 'AdvancedBeauty'
export type AudioPluginType = 'AIDenoise' | 'AudioEffect'

const Pluggins = ['VirtualBackground', 'AdvancedBeauty', 'AIDenoise', 'AudioEffect'] as const

export const videoPlugins = ['VirtualBackground', 'AdvancedBeauty']

export const audioPlugins = ['AIDenoise', 'AudioEffect']

export default Pluggins
