
export default class ServerShard  {
 
  declare id: number

 
  declare createdAt: string
 
  declare updatedAt: string
 
  declare domain: string
 
  /**
   * Is the server paired, as in paired?
   */
  declare paired: boolean

 

 
  declare isUp: boolean

 
  declare spaceTotal: number

 
  declare spaceFree: number

 
  declare memoryFree: number | null

 
  declare memoryTotal: number| null

 
  declare cpuUse: number| null

 
  declare bwIn: number| null

 
  declare bwOut: number| null


 
  declare lastHeartbeat: string


}