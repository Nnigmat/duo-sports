import type { Gender } from '../../../../../shared/types';
import boy from '../../../../assets/characters/idle-boy.mp4';
import girl from '../../../../assets/characters/idle-girl.mp4';
import restBoy from '../../../../assets/exercise-video/Rest/rest-boy.mp4';
import restGirl from '../../../../assets/exercise-video/Rest/rest-girl.mp4';
import cameraBoy from '../../../../assets/exercise-video/Camera/camera-boy.mp4';
import cameraGirl from '../../../../assets/exercise-video/Camera/camera-girl.mp4';
import successBoy from '../../../../assets/exercise-video/success/success-boy.mp4';
import successGirl from '../../../../assets/exercise-video/success/success-girl.mp4';

/** Ролик «чибик стоит» под пол спортсмена; без пола — девочка, как и у роликов упражнений. */
export function idleUrl(gender?: Gender): string {
  return gender === 'male' ? boy : girl;
}

/** Ролик «чибик отдыхает» под пол спортсмена; без пола — девочка. */
export function restUrl(gender?: Gender): string {
  return gender === 'male' ? restBoy : restGirl;
}

/** Ролик «чибик держит камеру» под пол спортсмена; без пола — девочка. */
export function cameraUrl(gender?: Gender): string {
  return gender === 'male' ? cameraBoy : cameraGirl;
}

/** Ролик «чибик радуется финишу» под пол спортсмена; без пола — девочка. */
export function successUrl(gender?: Gender): string {
  return gender === 'male' ? successBoy : successGirl;
}
