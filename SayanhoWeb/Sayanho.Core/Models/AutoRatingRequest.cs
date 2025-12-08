using System.Collections.Generic;
using Sayanho.Core.Logic;

namespace Sayanho.Core.Models
{
    public class AutoRatingRequest
    {
        public List<CanvasSheet> Sheets { get; set; }
        public ApplicationSettings Settings { get; set; }
    }
}
