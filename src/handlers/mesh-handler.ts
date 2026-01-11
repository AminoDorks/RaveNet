import { Rave } from 'ravejs';

import { SCREEN } from '../constants';
import { Handler } from '../interfaces/handler';
import {
  buildCheckbox,
  buildInput,
  buildSelect,
  numericFilter,
} from '../ui/inquirer';
import { Languages } from 'ravejs/dist/schemas';
import { MeshData } from '../schemas/mesh-data';
import { display } from '../ui/screen';
import { delay } from '../utils/helpers';

export class MeshHandler implements Handler {
  private __instance: Rave;

  constructor(instance: Rave) {
    this.__instance = instance;
  }

  private __parseMeshes = async (): Promise<MeshData[]> => {
    const rawMeshes = await this.__instance.mesh.getMany({
      limit: Number(
        await buildInput(SCREEN.locale.enters.enterMeshAmount, {
          filter: numericFilter,
        }),
      ),
      isPublic: true,
    });

    if (!rawMeshes.data) {
      display(SCREEN.locale.errors.tooManyMeshes);
      await delay(1);
      return await this.__parseMeshes();
    }

    return rawMeshes.data;
  };

  private __meshesChoosing = async (): Promise<MeshData[]> => {
    const meshes = await this.__parseMeshes();

    const selectedMeshes = await buildCheckbox(
      SCREEN.locale.enters.chooseMeshes,
      meshes.map((meshData) => ({
        name: meshData.mesh.videoTitle,
        description: SCREEN.locale.logs.usersQuantity.replace(
          '%s',
          meshData.users.length.toString(),
        ),
        value: meshData.mesh.id,
      })),
    );

    return meshes.filter((meshData) =>
      selectedMeshes.includes(meshData.mesh.id),
    );
  };

  private __meshesByLinks = async (): Promise<MeshData[]> => {
    const meshes: MeshData[] = [];
    const links = (await buildInput(SCREEN.locale.enters.enterLinks)).split(
      ' ',
    );
    await Promise.all(
      links.map(async (link) => {
        const mesh = await this.__instance.mesh.getByLink(link);
        if (mesh) {
          meshes.push({ mesh: mesh.data, users: mesh.data.users });
        }
      }),
    );

    return meshes;
  };

  async handle(): Promise<MeshData[]> {
    const setting = await buildSelect(
      SCREEN.locale.enters.chooseMeshScraping,
      SCREEN.locale.choices.methods,
    );

    switch (setting) {
      case 'choosing': {
        return await this.__meshesChoosing();
      }
      case 'links': {
        return await this.__meshesByLinks();
      }
      default: {
        return await this.__parseMeshes();
      }
    }
  }
}
