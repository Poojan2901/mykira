import ProgressDamper from './ProgressDamper'
import MoodDirector from './MoodDirector'
import CameraDirector from './CameraDirector'
import FirstPersonRig from './rig/FirstPersonRig'
import Background from './scenes/Background'
import VoidDust from './scenes/VoidDust'
import Star from './scenes/Star'
import SunCore from './scenes/SunCore'
import RevealRing from './scenes/RevealRing'
import NameParticles from './scenes/NameParticles'
import Bokeh from './scenes/Bokeh'
import MemoryOrbs from './scenes/MemoryOrbs'
import Shards from './scenes/Shards'
import ColdRain from './scenes/ColdRain'
import OrbitGallery from './scenes/OrbitGallery'
import Starfield from './scenes/Starfield'
import Constellation from './scenes/Constellation'
import Sunrise from './scenes/Sunrise'
import Celebration from './scenes/Celebration'
import Effects from './Effects'

export default function Experience() {
  return (
    <>
      <ProgressDamper />
      <MoodDirector />
      <CameraDirector />
      <FirstPersonRig />
      <Background />
      <Sunrise />
      <VoidDust />
      <Star />
      <SunCore />
      <RevealRing />
      <NameParticles />
      <Bokeh />
      <MemoryOrbs />
      <Shards />
      <ColdRain />
      <OrbitGallery />
      <Starfield />
      <Constellation />
      <Celebration />
      <Effects />
    </>
  )
}