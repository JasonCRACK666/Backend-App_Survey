import { UserEntity } from './UserEntity'

export interface UserRepository {
  findAllUsers: () => Promise<UserEntity[]>
  findUserById: (id: string) => Promise<UserEntity | null>
  findUserByEmail: (email: string) => Promise<UserEntity | null>
  findUserByUsername: (username: string) => Promise<UserEntity | null>
  registerUser: (newUser: UserEntity) => Promise<UserEntity | null>
  deleteUser: (id: string) => Promise<void>
  deleteAllUsers: () => Promise<void>
  updateUser: (
    id: string,
    userData: Omit<UserEntity, 'id' | 'is_admin'>
  ) => Promise<void>
}
