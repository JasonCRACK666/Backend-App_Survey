import jwt from 'jsonwebtoken'

import { PasswordEncrypter } from '../infrastructure/utils/passwordEncrypter'

import { UserEntity } from '../domain/UserEntity'
import { UserValue } from '../domain/UserValue'
import { UserRepository } from '../domain/UserRepository'
import config from '../../config'

export class UserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public getDetailUser = async (id: string) => {
    const user = await this.userRepository.findUserById(id)

    if (!user)
      throw {
        status: 404,
        error: `No se ha encontrado ningún usuario con ID ${id}`,
      }

    return { status: 200, user }
  }

  public registerUserAndNotify = async (userData: Omit<UserEntity, 'id'>) => {
    const userValue = new UserValue(userData)
    const userCreated = await this.userRepository.registerUser(userValue)

    if (!userCreated)
      throw {
        status: 404,
        error: 'El usuario no ha sido creado',
      }

    return { status: 200, user: userCreated }
  }

  public loginUser = async ({
    email,
    password,
  }: {
    email: string
    password: string
  }) => {
    const user = await this.userRepository.findUserByEmail(email)
    if (!user)
      throw {
        status: 404,
        error: 'No existe ningún usuario con el correo ingresado',
      }

    const matchPassword = await PasswordEncrypter.comparePassword(
      password,
      user.password
    )
    if (!matchPassword)
      throw {
        status: 404,
        error: 'La contraseña con incide con la cuenta a ingresar',
      }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      config.SECRET!,
      {
        expiresIn: '12h',
      }
    )

    return {
      status: 200,
      token,
    }
  }
}
