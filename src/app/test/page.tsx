
import {usePrivy} from '@privy-io/react-auth';

 
export default function Test (){

  const {ready} = usePrivy();


    return (
        <div>

            {ready?"hello cro i am ready":"no cro i am not ready`"}
        </div>
    )
}