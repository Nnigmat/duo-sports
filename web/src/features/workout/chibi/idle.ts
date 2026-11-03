import type { Gender } from '../../../../../shared/types';
import boy from '../../../../assets/characters/idle-boy.mp4';
import girl from '../../../../assets/characters/idle-girl.mp4';
import restBoy from '../../../../assets/exercise-video/Rest/rest-boy.mp4';
import restGirl from '../../../../assets/exercise-video/Rest/rest-girl.mp4';

/** Ролик «чибик стоит» под пол спортсмена; без пола — девочка, как и у роликов упражнений. */
export function idleUrl(gender?: Gender): string {
  return gender === 'male' ? boy : girl;
}

/** Ролик «чибик отдыхает» под пол спортсмена; без пола — девочка. */
export function restUrl(gender?: Gender): string {
  return gender === 'male' ? restBoy : restGirl;
}
