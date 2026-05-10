export function formatLastSeen(timestamp){

  if(!timestamp) return "";

  const date =
  new Date(timestamp);

  const now =
  new Date();

  const yesterday =
  new Date();

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  const time =
  date.toLocaleTimeString([],{
    hour:'2-digit',
    minute:'2-digit'
  });

  if(
    date.toDateString() ===
    now.toDateString()
  ){

    return "Today " + time;

  }

  if(
    date.toDateString() ===
    yesterday.toDateString()
  ){

    return "Yesterday " + time;

  }

  return date.toLocaleDateString();

}
