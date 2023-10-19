export type VideoPluginType = 'VirtualBackground' | 'AdvancedBeauty'
export type AudioPluginType = 'AIAudioEffects'

const Pluggins = ['VirtualBackground', 'AdvancedBeauty', 'AIAudioEffects'] as const

export const videoPlugins = ['VirtualBackground', 'AdvancedBeauty']

export const audioPlugins = ['AIAudioEffects']

export default Pluggins
