export type VideoPluginType = 'VirtualBackground' | 'AdvancedBeauty'
export type AudioPluginType = 'AIDenoise'

const Pluggins = ['VirtualBackground', 'AdvancedBeauty', 'AIDenoise'] as const

export const videoPlugins = ['VirtualBackground', 'AdvancedBeauty']

export const audioPlugins = ['AIDenoise']

export default Pluggins
