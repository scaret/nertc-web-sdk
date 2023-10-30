export type VideoPluginType = 'VirtualBackground' | 'AdvancedBeauty'
export type AudioPluginType = 'AIAudioEffects' | 'AIhowling'

const Pluggins = ['VirtualBackground', 'AdvancedBeauty', 'AIAudioEffects', 'AIhowling'] as const

export const videoPlugins = ['VirtualBackground', 'AdvancedBeauty']

export const audioPlugins = ['AIAudioEffects', 'AIhowling']

export default Pluggins
